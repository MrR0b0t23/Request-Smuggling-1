from flask import Flask, request, jsonify

app = Flask(__name__)

# Secret token that only the frontend knows
FRONTEND_SECRET = "frontend_secret_token_123"

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to the HTTP Request Smuggling CTF!",
        "hint": "Try accessing the /admin endpoint with the right headers."
    })

@app.route('/admin', methods=['GET'])
def admin():
    # Check if the request comes from the frontend by checking X-Forwarded-For
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if not forwarded_for.startswith('172.18.0.'):
        return jsonify({"error": "Access denied: Not from frontend"}), 403

    # Check for the frontend secret token
    if request.headers.get('X-Frontend-Token') != FRONTEND_SECRET:
        return jsonify({"error": "Invalid frontend token"}), 403

    # Check for admin access
    if request.headers.get('X-Admin-Access') != 'true':
        return jsonify({"error": "Admin access required"}), 403

    return jsonify({
        "flag": "CTF{http_smuggling_is_fun}",
        "message": "Congratulations! You've accessed the admin endpoint."
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False) 