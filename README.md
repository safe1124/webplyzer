# Webplyzer

A web application for converting images to WebP format with batch processing capabilities.

## Features

- 🖼️ Convert images (JPG, JPEG, PNG) to WebP format
- 📦 Batch conversion support
- 🌐 Multi-language support (English, Japanese, Korean)
- 💾 Automatic ZIP file creation for batch downloads
- 🎨 Modern and responsive UI
- ⚡ Fast conversion with quality control

## Installation

1. Clone the repository:
```bash
git clone https://github.com/safe1124/webplyzer.git
cd webplyzer
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Select one or multiple image files (JPG, JPEG, PNG)
2. Choose your preferred language from the dropdown
3. Click "Convert to WebP" button
4. Download individual WebP files or get all files in a ZIP archive

## Technologies

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Image Processing**: Pillow (PIL)
- **Internationalization**: Flask-Babel

## Deployment

This application is configured for deployment on Vercel. See `vercel.json` for configuration details.

## License

MIT License

## Author

safe1124

