# Guia: Configurar servidor gratis en Oracle Cloud

## Paso 1: Crear cuenta Oracle Cloud
1. Ve a https://cloud.oracle.com/free
2. Click "Start for free"
3. Rellena tus datos (nombre, email, pais)
4. Verifica tu email y telefono
5. Elige "Always Free" (gratis siempre, no se cobra nada)

## Paso 2: Crear servidor (VM)
1. En el dashboard, ve a "Compute" > "Instances"
2. Click "Create Instance"
3. Nombre: `spotify-server`
4. Image: Ubuntu 22.04
5. Shape: VM.Standard.A1.Flex (ARM, Always Free)
6. Networking: Create new VCN > "Create Virtual Cloud Network"
7. Add SSH keys: Upload your public key (o genera uno)
8. Click "Create"
9. Espera ~2 minutos hasta que diga "Running"
10. Copia la IP publica

## Paso 3: Conectarte al servidor
```bash
ssh -i tu_llave_privada ubuntu@TU_IP_PUBLICA
```

## Paso 4: Instalar todo en el servidor
Copia los archivos del servidor:
```bash
# Desde tu PC (en la carpeta del proyecto)
scp -i tu_llave_privada -r server/ ubuntu@TU_IP_PUBLICA:~/spotify-server
```

En el servidor:
```bash
cd ~/spotify-server
chmod +x setup.sh
./setup.sh
```

O copia y pega estos comandos uno a uno:
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar yt-dlp
sudo pip3 install yt-dlp

# Instalar ffmpeg
sudo apt install -y ffmpeg

# Copiar archivos del servidor (o usa SCP desde tu PC)
cd ~
mkdir -p spotify-server
cd spotify-server

# Instalar dependencias
npm install

# Abrir puerto 3000
sudo ufw allow 3000

# Iniciar servidor
node index.js
```

## Paso 5: Abrir el puerto en Oracle Cloud
1. En Oracle Cloud, ve a tu VM instance
2. Click en "Subnet" link
3. Ve a "Security Lists" > "Default Security List"
4. Click "Add Ingress Rules"
5. Source CIDR: `0.0.0.0/0`
6. Destination Port Range: `3000`
7. Click "Add Ingress Rules"

## Paso 6: Configurar la app Flutter
1. Abre `lib/config.dart`
2. Cambia `YOUR_SERVER_IP` por la IP de tu servidor
3. Reconstruye la app: `flutter build apk --release`

## Paso 7: Mantener el servidor encendido
Para que el servidor no se apague nunca:
```bash
# Instalar pm2 (gestor de procesos)
sudo npm install -g pm2

# Iniciar con pm2
cd ~/spotify-server
pm2 start index.js --name spotify-server

# Guardar configuracion
pm2 startup
pm2 save
```

Ahora el servidor se reinicia solo si se reinicia la VM.

## Verificar que funciona
Desde tu PC:
```bash
curl http://TU_IP_PUBLICA:3000/api/search?q=bad+bunny
```

Debe devolver JSON con canciones.
