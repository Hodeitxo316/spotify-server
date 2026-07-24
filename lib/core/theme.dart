import 'package:flutter/material.dart';

class AppTheme {
  // El clásico verde de Spotify
  static const Color spotifyGreen = Color(0xFF1DB954);
  static const Color backgroundBlack = Color(0xFF121212);
  static const Color surfaceDark = Color(0xFF282828);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: backgroundBlack,
      primaryColor: spotifyGreen,
      colorScheme: const ColorScheme.dark(
        primary: spotifyGreen,
        surface: surfaceDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundBlack,
        elevation: 0,
        centerTitle: false,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: backgroundBlack,
        selectedItemColor: spotifyGreen,
        unselectedItemColor: Colors.grey,
      ),
    );
  }
}