import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:just_audio/just_audio.dart';
import 'package:http/http.dart' as http;
import 'package:spotify_clone/config.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final AudioPlayer _audioPlayer = AudioPlayer();

  bool _isLoadingSearch = false;
  List<dynamic> _searchResults = [];

  String? _loadingSongId;
  Map<String, dynamic>? _currentSong;
  bool _isPlaying = false;
  String _loadingStatus = '';

  @override
  void initState() {
    super.initState();
    _audioPlayer.playerStateStream.listen((playerState) {
      if (mounted) {
        setState(() {
          _isPlaying = playerState.playing;
          if (playerState.processingState == ProcessingState.completed) {
            _isPlaying = false;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) return;

    setState(() {
      _isLoadingSearch = true;
      _searchResults = [];
    });

    try {
      final url = Uri.parse('$serverUrl/api/search?q=${Uri.encodeComponent(query)}&limit=25');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> decoded = jsonDecode(response.body);
        setState(() {
          _searchResults = decoded['results'];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al buscar canciones')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingSearch = false);
      }
    }
  }

  Future<void> _playSong(Map<String, dynamic> song) async {
    final songId = song['id'];

    if (_currentSong?['id'] == songId) {
      if (_isPlaying) {
        await _audioPlayer.pause();
      } else {
        await _audioPlayer.play();
      }
      return;
    }

    setState(() {
      _loadingSongId = songId;
      _currentSong = song;
      _loadingStatus = 'Buscando en YouTube...';
    });

    try {
      await _audioPlayer.stop();

      final query = '${song['title']} ${song['artist']}';
      final url = Uri.parse('$serverUrl/api/stream?q=${Uri.encodeComponent(query)}');
      final response = await http.get(url).timeout(const Duration(seconds: 30));

      if (response.statusCode != 200) {
        throw Exception('Error al obtener stream');
      }

      final Map<String, dynamic> data = jsonDecode(response.body);
      final audioUrl = data['url'];

      if (audioUrl == null || audioUrl.isEmpty) {
        throw Exception('No se encontro audio');
      }

      setState(() => _loadingStatus = 'Reproduciendo...');

      await _audioPlayer.setUrl(audioUrl);
      _audioPlayer.play();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
      setState(() => _currentSong = null);
    } finally {
      if (mounted) {
        setState(() {
          _loadingSongId = null;
          _loadingStatus = '';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onSubmitted: _performSearch,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Buscar canciones, artistas...',
                    hintStyle: const TextStyle(color: Colors.grey),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear, color: Colors.grey),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchResults = []);
                      },
                    ),
                    filled: true,
                    fillColor: Colors.grey[900],
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(30),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (_isLoadingSearch)
                  const CircularProgressIndicator(color: Colors.green)
                else if (_searchResults.isEmpty)
                  const Expanded(
                    child: Center(
                      child: Text(
                        'Busca algo para empezar a escuchar',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: ListView.builder(
                      itemCount: _searchResults.length,
                      itemBuilder: (context, index) {
                        final song = _searchResults[index];
                        final songId = song['id'];
                        final isThisSong = _currentSong?['id'] == songId;
                        final isLoadingThis = _loadingSongId == songId;

                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            vertical: 8.0,
                            horizontal: 8.0,
                          ),
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: CachedNetworkImage(
                              imageUrl: song['image'],
                              width: 50,
                              height: 50,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(
                                width: 50,
                                height: 50,
                                color: Colors.grey[900],
                                child: const Padding(
                                  padding: EdgeInsets.all(12.0),
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.green,
                                  ),
                                ),
                              ),
                              errorWidget: (context, url, error) => Container(
                                width: 50,
                                height: 50,
                                color: Colors.grey[900],
                                child: const Icon(
                                  Icons.music_note,
                                  color: Colors.grey,
                                ),
                              ),
                            ),
                          ),
                          title: Text(
                            song['title'],
                            style: TextStyle(
                              color: isThisSong ? Colors.green : Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            song['artist'],
                            style: const TextStyle(color: Colors.grey),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: isLoadingThis
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    color: Colors.green,
                                    strokeWidth: 2,
                                  ),
                                )
                              : Icon(
                                  (isThisSong && _isPlaying)
                                      ? Icons.pause_circle_filled
                                      : Icons.play_arrow,
                                  color: Colors.green,
                                  size: (isThisSong && _isPlaying) ? 32 : 24,
                                ),
                          onTap: () => _playSong(song),
                        );
                      },
                    ),
                  ),
                if (_currentSong != null) _buildMiniPlayer(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMiniPlayer() {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
              color: Colors.black54, blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: CachedNetworkImage(
                  imageUrl: _currentSong!['image'],
                  width: 45,
                  height: 45,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _currentSong!['title'],
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      _currentSong!['artist'],
                      style:
                          const TextStyle(color: Colors.grey, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (_loadingStatus.isNotEmpty)
                      Text(
                        _loadingStatus,
                        style: const TextStyle(
                            color: Colors.green, fontSize: 10),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              if (_loadingSongId != null)
                const SizedBox(
                  width: 36,
                  height: 36,
                  child: Padding(
                    padding: EdgeInsets.all(8.0),
                    child: CircularProgressIndicator(
                      color: Colors.green,
                      strokeWidth: 2,
                    ),
                  ),
                )
              else
                IconButton(
                  icon: Icon(
                    _isPlaying
                        ? Icons.pause_circle_filled
                        : Icons.play_circle_fill,
                    color: Colors.white,
                    size: 36,
                  ),
                  onPressed: () => _playSong(_currentSong!),
                ),
            ],
          ),
          StreamBuilder<Duration>(
            stream: _audioPlayer.positionStream,
            builder: (context, snapshot) {
              final position = snapshot.data ?? Duration.zero;
              final duration = _audioPlayer.duration ?? Duration.zero;

              double progress = 0.0;
              if (duration.inMilliseconds > 0) {
                progress =
                    position.inMilliseconds / duration.inMilliseconds;
              }

              return LinearProgressIndicator(
                value: progress.clamp(0.0, 1.0),
                backgroundColor: Colors.grey[800],
                color: Colors.green,
                minHeight: 3,
              );
            },
          ),
        ],
      ),
    );
  }
}
