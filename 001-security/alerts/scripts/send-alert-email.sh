#!/bin/bash
#
# Send Alert Email Script
# ========================
#
# Sends alert emails using templates with variable substitution
#
# Usage: ./send-alert-email.sh <template> <recipient> <variables_file>
#

set -euo pipefail

# Check arguments
if [[ $# -lt 3 ]]; then
    echo "Usage: $0 <template_path> <recipient_email> <variables_json>"
    echo "Example: $0 /path/to/template.html admin@example.com /tmp/vars.json"
    exit 1
fi

TEMPLATE_PATH="$1"
RECIPIENT="$2"
VARS_FILE="$3"

# Verify template exists
if [[ ! -f "$TEMPLATE_PATH" ]]; then
    echo "Error: Template not found: $TEMPLATE_PATH"
    exit 1
fi

# Verify variables file exists
if [[ ! -f "$VARS_FILE" ]]; then
    echo "Error: Variables file not found: $VARS_FILE"
    exit 1
fi

# Read template
TEMPLATE_CONTENT=$(cat "$TEMPLATE_PATH")

# Replace variables from JSON file
# This is a simple replacement - for production, use a proper templating engine
while IFS= read -r line; do
    KEY=$(echo "$line" | jq -r '.key')
    VALUE=$(echo "$line" | jq -r '.value')
    TEMPLATE_CONTENT="${TEMPLATE_CONTENT//\[$KEY\]/$VALUE}"
done < <(jq -r 'to_entries[] | {key: .key, value: .value} | @json' "$VARS_FILE" | jq -c '.')

# Extract subject from template (look for <title> tag)
SUBJECT=$(echo "$TEMPLATE_CONTENT" | grep -oP '<title>\K[^<]+' || echo "CostPlusDB Alert")

# Create temporary file for email body
TEMP_EMAIL=$(mktemp)
echo "$TEMPLATE_CONTENT" > "$TEMP_EMAIL"

# Send email using mail command (requires mailutils or equivalent)
if command -v mail &> /dev/null; then
    cat "$TEMP_EMAIL" | mail -a "Content-Type: text/html" -s "$SUBJECT" "$RECIPIENT"
    echo "Alert email sent to $RECIPIENT"
elif command -v sendmail &> /dev/null; then
    {
        echo "To: $RECIPIENT"
        echo "Subject: $SUBJECT"
        echo "Content-Type: text/html; charset=UTF-8"
        echo ""
        cat "$TEMP_EMAIL"
    } | sendmail -t
    echo "Alert email sent to $RECIPIENT via sendmail"
else
    echo "Error: No mail command available (install mailutils or sendmail)"
    rm "$TEMP_EMAIL"
    exit 1
fi

# Clean up
rm "$TEMP_EMAIL"

# Log the alert
ALERT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/alerts/sent-emails.log"
mkdir -p "$(dirname "$ALERT_LOG")"
echo "$(date +'%Y-%m-%d %H:%M:%S') - Email sent: $SUBJECT to $RECIPIENT" >> "$ALERT_LOG"

exit 0
