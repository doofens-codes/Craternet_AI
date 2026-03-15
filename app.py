from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import config  # initialises Firebase + creates dirs

app = Flask(__name__)
app.secret_key = config.FLASK_SECRET
CORS(app)

# Register blueprints
from routes.detect   import detect_bp
from routes.potholes import potholes_bp
from routes.admin    import admin_bp
from routes.report   import report_bp

app.register_blueprint(detect_bp)
app.register_blueprint(potholes_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(report_bp)

# Static file serving
@app.route("/static/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(str(config.UPLOAD_DIR), filename)

@app.route("/static/results/<path:filename>")
def results(filename):
    return send_from_directory(str(config.RESULTS_DIR), filename)

# All page routes served by single template
@app.route("/")
@app.route("/map")
@app.route("/report")
@app.route("/admin")
def index():
    return render_template("app.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
