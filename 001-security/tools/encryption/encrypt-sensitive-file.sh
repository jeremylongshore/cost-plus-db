#!/bin/bash
#
# Sensitive File Encryption Tool
# ===============================
#
# Encrypts sensitive files (credentials, keys, etc.) using AES-256
#
# Usage: ./encrypt-sensitive-file.sh <input_file> [output_file]
#

set -euo pipefail

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check arguments
if [[ $# -lt 1 ]]; then
    error "Usage: $0 <input_file> [output_file]"
    error "Example: $0 credentials.txt credentials.txt.enc"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="${2:-${INPUT_FILE}.enc}"

# Verify input file exists
if [[ ! -f "$INPUT_FILE" ]]; then
    error "Input file not found: $INPUT_FILE"
    exit 1
fi

# Check if output file already exists
if [[ -f "$OUTPUT_FILE" ]]; then
    warn "Output file already exists: $OUTPUT_FILE"
    read -p "Overwrite? (y/N): " CONFIRM
    if [[ "$CONFIRM" != "y" ]] && [[ "$CONFIRM" != "Y" ]]; then
        log "Operation cancelled"
        exit 0
    fi
fi

log "Encrypting file: $INPUT_FILE"
log "Output file: $OUTPUT_FILE"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    error "OpenSSL not found. Install with: sudo apt install openssl"
    exit 1
fi

# Prompt for passphrase (twice for confirmation)
echo "Enter encryption passphrase:"
read -s PASSPHRASE1
echo ""
echo "Confirm passphrase:"
read -s PASSPHRASE2
echo ""

if [[ "$PASSPHRASE1" != "$PASSPHRASE2" ]]; then
    error "Passphrases do not match"
    exit 1
fi

if [[ ${#PASSPHRASE1} -lt 12 ]]; then
    error "Passphrase must be at least 12 characters"
    exit 1
fi

# Encrypt the file using AES-256-CBC
log "Encrypting with AES-256-CBC..."
if echo "$PASSPHRASE1" | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -in "$INPUT_FILE" -out "$OUTPUT_FILE" -pass stdin; then
    log "✓ Encryption successful"
else
    error "Encryption failed"
    exit 1
fi

# Verify encrypted file was created
if [[ -f "$OUTPUT_FILE" ]]; then
    ORIGINAL_SIZE=$(stat -c%s "$INPUT_FILE")
    ENCRYPTED_SIZE=$(stat -c%s "$OUTPUT_FILE")

    echo ""
    log "Encryption complete!"
    echo "  Original file: $INPUT_FILE ($ORIGINAL_SIZE bytes)"
    echo "  Encrypted file: $OUTPUT_FILE ($ENCRYPTED_SIZE bytes)"
    echo ""

    warn "IMPORTANT:"
    echo "  1. Store the passphrase in a secure password manager"
    echo "  2. Test decryption before deleting original file"
    echo "  3. Store encrypted file with restricted permissions"
    echo ""

    # Set secure permissions on encrypted file
    chmod 600 "$OUTPUT_FILE"
    log "Set permissions: 600 (owner read/write only)"

    # Offer to securely delete original
    echo ""
    read -p "Securely delete original file? (y/N): " DELETE_CONFIRM
    if [[ "$DELETE_CONFIRM" == "y" ]] || [[ "$DELETE_CONFIRM" == "Y" ]]; then
        if command -v shred &> /dev/null; then
            log "Securely deleting original file..."
            shred -vfz -n 3 "$INPUT_FILE"
            log "✓ Original file securely deleted"
        else
            rm "$INPUT_FILE"
            warn "Original file deleted (shred not available for secure deletion)"
        fi
    fi

    echo ""
    log "Decryption command:"
    echo "  openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 -in $OUTPUT_FILE -out ${INPUT_FILE}.decrypted"
else
    error "Encrypted file was not created"
    exit 1
fi

exit 0
