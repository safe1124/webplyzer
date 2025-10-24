from flask import Flask, render_template, request, send_file, jsonify
from flask_babel import Babel, gettext
from PIL import Image
import os
import re
import zipfile
import uuid
from datetime import datetime

app = Flask(__name__)
app.config['BABEL_DEFAULT_LOCALE'] = 'ja'
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max total size

UPLOAD_DIR = "/tmp"
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
MAX_FILES = 25

# /tmp is always available on Vercel, but ensure it exists locally
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_locale():
    """Select language based on URL parameter or browser settings"""
    lang = request.args.get('lang')
    if lang in ['ja', 'en', 'ko']:
        return lang
    return request.accept_languages.best_match(['ja', 'en', 'ko']) or 'ja'

babel = Babel(app, locale_selector=get_locale)

def sanitize_filename(filename):
    """Sanitize filename while preserving Unicode characters (Korean, Japanese, Chinese, etc.)"""
    if not filename:
        return "image"
    # Remove dangerous characters but keep Unicode letters, numbers, spaces, hyphens, underscores
    filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
    # Replace multiple spaces with single space
    filename = re.sub(r'\s+', ' ', filename)
    # Trim spaces
    filename = filename.strip()
    # If empty after sanitization, use default
    if not filename:
        return "image"
    return filename

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.context_processor
def inject_get_locale():
    """Make get_locale available in templates"""
    return dict(get_locale=get_locale)

@app.route("/")
def index():
    """Render main page"""
    return render_template("index.html")

@app.route("/convert", methods=["POST"])
def convert():
    """Convert uploaded images to WebP format"""
    converted_files = []
    session_id = str(uuid.uuid4())

    try:
        # Get all uploaded files
        files = request.files.getlist('files')

        # Check if files exist
        if not files or len(files) == 0:
            return jsonify({'error': gettext('no_file')}), 400

        # Check file count limit
        if len(files) > MAX_FILES:
            return jsonify({'error': gettext('too_many_files')}), 400

        # Get base name from form
        base_name = request.form.get("base_name", "image").strip()
        if not base_name:
            base_name = "image"

        # Sanitize filename (preserves Unicode characters)
        base_name = sanitize_filename(base_name)

        # Get file index if provided (for single file conversion)
        file_index = request.form.get("file_index")

        # Process each file
        for idx, file in enumerate(files, start=1):
            # Use provided file_index if available, otherwise use loop index
            actual_idx = int(file_index) if file_index else idx
            # Check if file was selected
            if file.filename == '':
                continue

            # Validate file extension
            if not allowed_file(file.filename):
                continue

            # Create unique filename
            new_name = f"{base_name}_{actual_idx}.webp"
            output_path = os.path.join(UPLOAD_DIR, f"{session_id}_{new_name}")

            # Convert image to WebP
            img = Image.open(file)

            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = rgb_img
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Save as WebP
            img.save(output_path, "webp", quality=90)
            converted_files.append((output_path, new_name))

        # If no valid files were processed
        if len(converted_files) == 0:
            return jsonify({'error': gettext('no_valid_files')}), 400

        # If single file, send it directly
        if len(converted_files) == 1:
            output_path, new_name = converted_files[0]
            response = send_file(
                output_path,
                as_attachment=True,
                download_name=new_name,
                mimetype='image/webp'
            )
        else:
            # Multiple files: create ZIP
            zip_name = f"{base_name}_webp.zip"
            zip_path = os.path.join(UPLOAD_DIR, f"{session_id}_{zip_name}")

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path, file_name in converted_files:
                    zipf.write(file_path, file_name)

            converted_files.append((zip_path, zip_name))

            response = send_file(
                zip_path,
                as_attachment=True,
                download_name=zip_name,
                mimetype='application/zip'
            )

        # Clean up files after sending
        @response.call_on_close
        def cleanup():
            try:
                for file_path, _ in converted_files:
                    if os.path.exists(file_path):
                        os.remove(file_path)
            except Exception:
                pass

        return response

    except Exception as e:
        # Clean up on error
        for file_path, _ in converted_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
