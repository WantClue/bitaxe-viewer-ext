# Bitaxe Viewer Chrome Extension

## Overview

The Bitaxe Viewer is a Chrome extension designed to scan local networks for Bitaxe devices and display their hash rates. This tool is invaluable for Bitcoin miners using Bitaxe hardware, allowing quick and easy monitoring of their devices' performance across the network.

## Features

- **Network Scanning**: Automatically scans the local network for Bitaxe devices.
- **Hash Rate Display**: Shows the current hash rate for each detected Bitaxe device.
- **Data Persistence**: Stores found devices and their information for quick access upon reopening.
- **Auto-Refresh**: Automatically refreshes stored device data when the extension is opened.
- **User-Friendly Interface**: Clean and intuitive design for easy navigation and use.

## Installation

1. Clone this repository or download the ZIP file and extract it.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.
5. The Bitaxe Viewer extension should now appear in your Chrome toolbar.

## Usage

1. Click on the Bitaxe Viewer icon in your Chrome toolbar to open the popup.
2. The extension will automatically display any previously found devices.
3. Click the "Scan for Bitaxe devices" button to initiate a new network scan.
4. Wait for the scan to complete. Discovered devices will be displayed with their IP addresses and current hash rates.
5. The extension will automatically store found devices for quick access in future sessions.

## Files Description

- `manifest.json`: Defines the extension's properties and permissions.
- `popup.html`: The HTML structure of the extension's popup window.
- `popup.js`: Contains the main logic for the user interface and interaction with the Chrome API.
- `background.js`: Handles background tasks like network scanning.
- `styles.css`: Defines the styling for the popup window.

## Contributing

Contributions to the Bitaxe Viewer extension are welcome! Please feel free to submit pull requests or create issues for bugs and feature requests.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
You should have received a copy of the GNU General Public License along with this program. If not, see https://www.gnu.org/licenses/.

## Disclaimer

This extension is designed for use on networks you own or have permission to scan. Always ensure you have the necessary rights before scanning any network.

## Support

For support, questions, or more information, please open an issue in this GitHub repository.