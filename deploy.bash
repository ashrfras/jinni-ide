#!/bin/bash

# Check if a domain parameter is provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <domain> <git-repo-url> <main-file-name>"
    exit 1
fi

DOMAIN="$1"
REPO_URL="$2"
MAIN_FILE="$3"

# Extract the repository name from the URL
REPO_NAME=$(basename "$GIT_REPO_URL" .git)
CLONE_DIR="$HOME/$REPO_NAME"

# Set the log file location
LOG_FILE="$(dirname "$0")/jinni.log"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

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
	sudo ufw enable
	sudo ufw allow ssh
	sudo ufw allow http
	sudo ufw allow https
	log "Installing Nginx"
	sudo apt install nginx -y
	log "Installing Certbot"
	sudo apt install python3-certbot-nginx -y
	log "Writing Nginx config"
	write_nginx_config
	sudo service nginx start
	log "Applying SSL"
	sudo certbot --nginx --register-unsafely-without-email --redirect --non-interactive --agree-tos -d $domain
fi

# check node
log "Checking Node"
if ! command -v nvm &> /dev/null; then
	log "Node not installed, setting up runtime"
	sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
	source ~/.bashrc
	sudo nvm install --lts
	sudo npm i -g pm2
	pm2 startup ubuntu
fi

# check jinni
log "Checking Jinni"
if ! command -v jinni &> /dev/null; then
	log "Installing Jinni"
	mkdir ~/.jinni
	mkdir ~/.jinni/jiss
	git clone "https://github.com/ashrfras/jinni.git" ~/.jinni
	git clone "https://github.com/ashrfras/JiSS.git" ~/.jinni/jiss
	mkdir ~/.jinni/bin
	ln -s ~/.jinni/jinni ~/.jinni/bin/jinni
	chmod +x ~/.jinni/bin/jinni
	#add to PATH
	line='export PATH="~/.jinni/bin:$PATH"'
	# Check if the line is already present in .bashrc
	if ! grep -q "$line" ~/.bashrc; then
		echo "$line" >> ~/.bashrc
		source ~/.bashrc
	fi
	#compile jiss
	jinni --nowarning --norun ~/.jinni/jiss
fi

# Remove the project directory if it already exists
if [ -d "$CLONE_DIR" ]; then
    log "Removing existing directory: $CLONE_DIR"
    rm -rf "$CLONE_DIR"
fi

# Create an empty directory
mkdir -p "$CLONE_DIR"

log "Cloning repo"
git clone "$GIT_REPO_URL" "$CLONE_DIR"

#compile
~/.jinni/bin/jinni --nowarnings --norun --web "$CLONE_DIR"/"$MAIN_FILE"

#run
pm2 stop all
pm2 delete all
pm2 start server.mjs