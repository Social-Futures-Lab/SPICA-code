from flask import Flask, jsonify, request, g, current_app, render_template, redirect
from flask_cors import CORS

import sqlite3
import json
import csv

from io import StringIO
from functools import wraps

DEFAULT_DB_LOCATION = './database/results.sqlite'

app = Flask(__name__)
CORS(app)

def parse_user_list(userlist):
  users = {}
  for records in userlist.split(';'):
    try:
      name, password = records.split(':', 2)
      users[name] = password
    except:
      pass
  return users

def requires_login(fn):
  @wraps(fn)
  def wrapped_view(**kwargs):
    if request.authorization is None or getattr(g, '_authorized_user', None) is None:
      return ('Unauthorized', 401, {
        'WWW-Authenticate': 'Basic realm="Login Required"'
      })
    return fn(**kwargs)

  return wrapped_view

def get_db():
  db = getattr(g, '_db', None)
  if db is None:
    db = g._db = sqlite3.connect(current_app.config['DATABASE_URI'])
  return db

@app.before_request
def handle_authentication():
  if request.authorization is not None:
    auth = request.authorization
    users = current_app.config['USERS']
    if users is None:
      return
    if auth.parameters['username'] in users and \
      users[auth.parameters['username']] == auth.parameters['password']:

      g._authorized_user = auth.parameters['username']
    else:
      return

@app.teardown_appcontext
def close_db_connection(exception):
  db = getattr(g, '_db', None)
  if db is not None:
    try:
      db.close()
    except:
      pass

@app.route("/api/status")
def status():
  return jsonify({
    "status": "up"
  })

@app.route("/api/admin/init-db")
@requires_login
def admin_init_db():
  init_db()
  return jsonify({"status": "complete"})

@app.route("/api/admin/trigger-return/<worker_id>")
@requires_login
def admin_force_return(worker_id):
  cursor = get_db().cursor();
  cursor.execute('UPDATE results SET results = ? WHERE participant_id = ? AND results = ?', ('RETURNED', worker_id, 'DUMMY'));
  rows = cursor.rowcount;
  get_db().commit()

  return jsonify({ 'status': 200, 'note': f'Affected rows {rows}'})

@app.route("/api/admin/results.csv")
@requires_login
def admin_export_csv():
  results = get_db().cursor().execute('SELECT session_id, participant_id, group_id, task_id, results, comments FROM results').fetchall()

  def generate(results):
    data = StringIO()
    w = csv.writer(data)

    w.writerow(['SessionId', 'ParticipantId','Group', 'TaskId', 'Results', 'Feedback'])
    yield data.getvalue()
    data.seek(0)
    data.truncate(0)
    for row in results:
      w.writerow(row)
      yield data.getvalue()
      data.seek(0)
      data.truncate(0)
  return app.response_class(response = generate(results), status=200, mimetype='text/csv')

@app.route("/api/submit", methods=["POST"])
def collect_results():
  try:
    input = request.get_json()
  except Exception as e:
    return jsonify({ 'status': 400, 'note': f'Malformed input {request.get_data()}' }), 400

  # Find the assignment
  if not 'participantId' in input:
    return jsonify({ 'status': 400, 'note': f'Read participantId failed' }), 400
  if not 'sessionId' in input:
    return jsonify({ 'status': 400, 'note': f'Read sessionId failed' }), 400
  if not 'group' in input:
    return jsonify({ 'status': 400, 'note': f'Read group failed' }), 400
  if not 'taskId' in input:
    return jsonify({ 'status': 400, 'note': f'Read taskId failed' }), 400
  if not 'results' in input:
    return jsonify({ 'status': 400, 'note': f'Read results failed' }), 400


  participant_id = input['participantId']
  session_id = input['sessionId']
  group_name = input['group']
  task_id = input['taskId']
  data = input['results']
  comments = input['feedback'] if 'feedback' in input else ''

  try:
    # Save the results
    get_db().cursor().execute('INSERT OR REPLACE INTO results (session_id, participant_id, group_id, task_id, results, comments) VALUES (?, ?, ?, ?, ?, ?)',
                              (session_id, participant_id, group_name, task_id, data, comments));
    # Save
    get_db().commit()
  except Exception as e:
    return jsonify({'status': 200, 'note': repr(e) });

  return jsonify({'status': 200, 'note': 'Success'})

########## HTML

@app.route('/admin')
@requires_login
def admin_panel():
  return render_template('admin.html')

########### Regular endpoints

@app.route("/")
def host_main_page():
  # get the 4 main prolific args
  session_id = request.args.get('sessionId')
  group_name = request.args.get('group')
  participant_id = request.args.get('participantId')
  exit_code = request.args.get('code')

  if session_id is None or group_name is None or participant_id is None:
    return jsonify({'status': 400, 'note': 'Did not specify sessionId, group, or participantId!'}), 400

  # Find out if we've seen the session id before
  existing_record = get_db().cursor().execute('SELECT task_id FROM results WHERE session_id = ? AND participant_id = ? and group_id = ?', (session_id, participant_id, group_name)).fetchone()
  if existing_record is None:
    # Figure out the task id
    assignment_index = get_db().cursor().execute('''
SELECT tasks_filtered.task_id, (tasks_filtered.total_assignable - COUNT(results_filtered.participant_id)) as num_remaining
FROM
  (SELECT task_id, SUM(num_assignable) AS total_assignable FROM tasks WHERE constrain_group = ? OR constrain_group = '' GROUP BY task_id) as tasks_filtered
LEFT JOIN
  (SELECT * FROM results WHERE group_id = ? AND results <> 'RETURNED') as results_filtered
ON results_filtered.task_id = tasks_filtered.task_id
GROUP BY tasks_filtered.task_id
ORDER BY num_remaining DESC, substr(tasks_filtered.task_id, -3) ASC, tasks_filtered.task_id ASC;
                                                 ''', (group_name, group_name)).fetchone()
    task_id = assignment_index[0]

    # Insert a dummy into the db
    get_db().cursor().execute('INSERT OR REPLACE INTO results (session_id, participant_id, group_id, task_id, results, comments) VALUES (?, ?, ?, ?, ?, ?)',
                              (session_id, participant_id, group_name, task_id, 'DUMMY', 'DUMMY'));
    get_db().commit()
  else:
    task_id = existing_record[0]

  homepage = current_app.config.get('REMOTE_TASK_PAGE', 'http://127.0.0.1:8000')
  destination_url = f'{homepage}/?config=./inputs/{task_id}.json&group={group_name}&participantId={participant_id}&sessionId={session_id}&exitCode={exit_code}'
  return redirect(destination_url, code = 302)

##########

def init_db():
  with app.app_context():
    db = get_db()
    with app.open_resource('schema.sql', mode = 'r') as f:
      db.cursor().executescript(f.read())
    db.commit()
  return True

if __name__ == "__main__":
  from os import environ, path
  from dotenv import load_dotenv

  basedir = path.abspath(path.dirname(__file__))
  load_dotenv(path.join(basedir, '.env'))

  with app.app_context():

    DATABASE_URI = environ.get('DATABASE', DEFAULT_DB_LOCATION)
    PORT = int(environ.get('PORT', 5000))
    REMOTE_TASK_PAGE = environ.get('REMOTE_TASK_PAGE', f'http://127.0.0.1:{PORT}')
    USERS = parse_user_list(environ.get('ADMINISTRATORS'))

    app.config.update(
      DATABASE_URI = DATABASE_URI,
      USERS = USERS,
      REMOTE_TASK_PAGE = REMOTE_TASK_PAGE
    )

    app.run(port = PORT)
