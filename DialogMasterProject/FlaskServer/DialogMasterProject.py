from flask import Flask, request, jsonify, send_file
import sqlite3
from sqlite3 import Error
import os
import csv

app = Flask(__name__)

def create_connection(db_file):
    conn = None;
    try:
        conn = sqlite3.connect(db_file)
    except Error as e:
        print(e)

    return conn

def select_employee_questions(conn, employee_id):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM Questions_{employee_id}")

    rows = cur.fetchall()

    return rows

def store_response(conn, employee_id, question_text, answer_text, processed_id):
    cur = conn.cursor()
    cur.execute(f"INSERT INTO Responses_{employee_id}(ProcessedID, QuestionText, AnswerText) VALUES(?, ?, ?)", (processed_id, question_text, answer_text))
    conn.commit()

def update_state(conn, employee_id, remaining_questions, current_question_id):
    cur = conn.cursor()
    cur.execute(f"UPDATE State SET RemainingQuestions = ?, CurrentQuestionID = ? WHERE EmployeeID = ?", (remaining_questions, current_question_id, employee_id))
    conn.commit()

def reset_responses_and_state(conn, employee_id):
    cur = conn.cursor()
    cur.execute(f"DELETE FROM Responses_{employee_id}")
    cur.execute(f"UPDATE State SET RemainingQuestions = (SELECT COUNT(*) FROM Questions_{employee_id}), CurrentQuestionID = 0 WHERE EmployeeID = ?", (employee_id,))
    conn.commit()

def export_responses(conn, employee_id):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM Responses_{employee_id}")

    rows = cur.fetchall()

    with open('result.txt', 'w') as f:
        writer = csv.writer(f)
        writer.writerows(rows)

@app.route('/get_questions', methods=['GET'])
def get_questions():
    employee_id = request.args.get('EmployeeID')
    db_file = os.path.join(app.root_path, 'dialog.db')  # Относительный путь к файлу базы данных
    
    conn = create_connection(db_file)
    with conn:
        questions = select_employee_questions(conn, employee_id)
    
    return jsonify(questions)

@app.route('/store_response', methods=['POST'])
def save_response():
    data = request.get_json()
    message = data.get('message')
    question_text = data.get('question_text')
    processed_id = data.get('processed_id')
    employee_id = data.get('employee_id')
    
    db_file = os.path.join(app.root_path, 'dialog.db')  # Относительный путь к файлу базы данных
    conn = create_connection(db_file)
    with conn:
        store_response(conn, employee_id, question_text, message, processed_id)
    
    return jsonify({'status': 'success'})

@app.route('/update_state', methods=['POST'])
def update_current_state():
    data = request.get_json()
    employee_id = data.get('employee_id')
    remaining_questions = data.get('remaining_questions')
    current_question_id = data.get('current_question_id')
    
    db_file = os.path.join(app.root_path, 'dialog.db')  # Относительный путь к файлу базы данных
    conn = create_connection(db_file)
    with conn:
        update_state(conn, employee_id, remaining_questions, current_question_id)
    
    return jsonify({'status': 'success'})

@app.route('/reset', methods=['POST'])
def reset():
    employee_id = request.get_json().get('employee_id')
    
    db_file = os.path.join(app.root_path, 'dialog.db')  # Относительный путь к файлу базы данных
    conn = create_connection(db_file)
    with conn:
        reset_responses_and_state(conn, employee_id)
    
    return jsonify({'status': 'success'})

@app.route('/export', methods=['GET'])
def export():
    employee_id = request.args.get('employee_id')
    
    db_file = os.path.join(app.root_path, 'dialog.db')  # Относительный путь к файлу базы данных
    conn = create_connection(db_file)
    with conn:
        export_responses(conn, employee_id)
    
    return send_file('result.txt', as_attachment=True)

if __name__ == '__main__':
    app.run(port=5000)
