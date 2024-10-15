#!/bin/bash

# Redirect all output to output.log
exec > "$HOME/output.log" 2>&1

# Check if a domain parameter is provided
if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <domain> <git-repo-url> <main-file-name> <password>"
    exit 1
fi

echo "Running script as $USER"
source "$HOME/.bash_profile"

DOMAIN="$1"
REPO_URL="$2"
MAIN_FILE="$3"
PASSWORD="$4"

# Extract the repository name from the URL
REPO_NAME=$(basename "$REPO_URL" .git)
CLONE_DIR="$HOME/$REPO_NAME"

# Set the log file location
LOG_FILE="$(dirname "$0")/jinni.log"

# Function to log messages
log() {
	echo "$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

rm "$LOG_FILE"

#function to write server config
write_nginx_config() {
	CONTENT="server {
        server_name $DOMAIN;

        location / {
			add_header Access-Control-Allow-Origin *;
			add_header Cross-Origin-Resource-Policy cross-origin;
			add_header Cross-Origin-Embedder-Policy cross-origin;
			proxy_pass http://localhost:3000;
			proxy_http_version 1.1;
			proxy_set_header Upgrade \$http_upgrade;
			proxy_set_header Connection 'upgrade';
			proxy_set_header Host \$host;
			proxy_cache_bypass \$http_upgrade;
        }
    }
    server {
		server_name $DOMAIN;
		return 301 \$scheme://$DOMAIN\$request_uri;
    }"
	echo "$CONTENT" | sudo tee /etc/nginx/sites-enabled/default > /dev/null
}

log "Checking Nginx"
if ! command -v nginx &> /dev/null; then
	log "Nginx not installed, setting up the server"
	log "Setting ufw"
	echo "$PASSWORD" | sudo -S ufw enable
	echo "$PASSWORD" | sudo -S ufw allow ssh
	echo "$PASSWORD" | sudo -S ufw allow http
	echo "$PASSWORD" | sudo -S ufw allow https
	log "Installing Nginx"
	echo "$PASSWORD" | sudo -S apt install nginx -y
	log "Installing Certbot"
	echo "$PASSWORD" | sudo -S apt install python3-certbot-nginx -y
	echo "$PASSWORD" | sudo -S service nginx start
fi

# check node
log "Checking Node"
if [ ! -e "$HOME/.nvm" ]; then
	log "Node not installed, setting up runtime"
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
	export NVM_DIR="$HOME/.nvm"
	[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
	nvm install --lts
	npm i -g pm2
	pm2 startup ubuntu
fi
#add to bashprofile if not already
line='export NVM_DIR="$HOME/.nvm"'
if ! grep -q "$line" "$HOME/.bash_profile"; then
	echo 'export NVM_DIR="$HOME/.nvm"' >> "$HOME/.bash_profile"
	echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> "$HOME/.bash_profile"
	#load configuration
	source "$HOME/.bash_profile"
fi

# check jinni
log "Installing Jinni"
rm -rf "$HOME/.jinni"
mkdir -p "$HOME/.jinni/jinni"
mkdir -p "$HOME/.jinni/jiss"
git clone "https://github.com/ashrfras/jinni-compiler.git" "$HOME/.jinni/jinni"
git clone "https://github.com/ashrfras/jiss.git" "$HOME/.jinni/jiss"
mkdir -p "$HOME/.jinni/bin"
ln -s "$HOME/.jinni/jinni/jinni" "$HOME/.jinni/bin/jinni"
chmod +x "$HOME/.jinni/bin/jinni"

#add to to bashprofile if not already
line='export PATH="$HOME/.jinni/bin:$PATH"'
if ! grep -q "$line" "$HOME/.bash_profile"; then
	echo "$line" >> "$HOME/.bash_profile"
	#load configuration
	source "$HOME/.bash_profile"
fi

#compile jiss
jinni --nowarning --norun "$HOME/.jinni/jiss"

# Remove the project directory if it already exists
if [ -d "$CLONE_DIR" ]; then
    log "Removing existing directory: $CLONE_DIR"
    rm -rf "$CLONE_DIR"
fi

# Create an empty directory
mkdir -p "$CLONE_DIR"

log "Cloning repo"
git clone "$REPO_URL" "$CLONE_DIR"

#compile
jinni --nowarnings --norun --web "$CLONE_DIR/$MAIN_FILE"
mkdir "$CLONE_DIR/node_modules"
npm install --prefix "$CLONE_DIR"

#run
pm2 stop all
pm2 delete all
pm2 start server.mjs --cwd "$CLONE_DIR"

if ! grep -q "$DOMAIN" "/etc/nginx/sites-enabled/default"; then
	log "Writing Nginx config"
	write_nginx_config
	log "Applying SSL"
	echo "$PASSWORD" | sudo -S certbot --nginx --register-unsafely-without-email --redirect --non-interactive --agree-tos -d "$DOMAIN"
fi
echo "$PASSWORD" | sudo -S service nginx reload