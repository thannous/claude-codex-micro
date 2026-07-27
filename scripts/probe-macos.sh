#!/bin/sh
set -eu

CLAUDE_APP_PATH="${CLAUDE_APP_PATH:-/Applications/Claude.app}"

echo "macOS"
sw_vers
uname -m

echo
echo "Claude Desktop"
if [ -d "$CLAUDE_APP_PATH" ]; then
  printf "bundle: "
  plutil -extract CFBundleIdentifier raw -o - \
    "$CLAUDE_APP_PATH/Contents/Info.plist"
  printf "version: "
  plutil -extract CFBundleShortVersionString raw -o - \
    "$CLAUDE_APP_PATH/Contents/Info.plist"
else
  echo "not found at $CLAUDE_APP_PATH"
fi

echo
echo "Codex Micro HID entries"
ioreg -r -l -c IOHIDDevice 2>/dev/null | awk '
function clean(line) {
  sub(/^.* = /, "", line)
  gsub(/^"|"$/, "", line)
  return line
}
function emit() {
  if (product ~ /^Codex Micro/) {
    found = 1
    print "product: " product
    print "manufacturer: " manufacturer
    print "transport: " transport
    print "vendor_id: " vendor_id
    print "product_id: " product_id
    print "version_number: " version_number
    print ""
  }
}
/^\+-o / {
  emit()
  product = manufacturer = transport = ""
  vendor_id = product_id = version_number = ""
}
/^[ |]*"Product" = / { product = clean($0) }
/^[ |]*"Manufacturer" = / { manufacturer = clean($0) }
/^[ |]*"Transport" = / { transport = clean($0) }
/^[ |]*"VendorID" = / { vendor_id = clean($0) }
/^[ |]*"ProductID" = / { product_id = clean($0) }
/^[ |]*"VersionNumber" = / { version_number = clean($0) }
END {
  emit()
  if (!found) print "not found"
}'

echo "Note: HID visibility does not prove Nordic UART Service availability."
