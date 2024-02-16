# fix windows registry mismatched types
import mimetypes
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

from flask import Flask
from flask import render_template, make_response, send_from_directory

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route("/")
def index(name="Change!"):
    return render_template('Planning.html', name=name)
    
@app.route('/Planning', methods=['GET'])
def planning(name="Change!"):
    return render_template('Planning.html', name=name)

@app.route('/Settings', methods=['GET'])
def authHtml(name="Change!"):
    return render_template('Settings.html', name=name)

@app.route('/tests', methods=['GET'])
def testsHtml(name="Change!"):
    return render_template('tests.html', name=name)
    
@app.route('/sw.js')
def sw():
    response=make_response(send_from_directory('static', 'sw.js'))
    #change the content header file. Can also omit; flask will handle correctly.
    response.headers['Content-Type'] = 'application/javascript'
    return response

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)