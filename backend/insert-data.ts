import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

async function insertData() {
    const db = new sqlite3.Database('./college.db');

    // Hash passwords
    const newStudentPassword = await bcrypt.hash('newpassword123', 10);
    const newRegistrarPassword = await bcrypt.hash('newpassword123', 10);

    db.serialize(() => {
        // Insert users
        db.run(
            'INSERT OR IGNORE INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)',
            [3, 'newstudent', newStudentPassword, 'Student', 'newstudent@example.com'],
            (err) => { if (err) console.error('Error inserting user:', err); }
        );
        db.run(
            'INSERT OR IGNORE INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)',
            [4, 'newregistrar', newRegistrarPassword, 'Registrar', 'newregistrar@example.com'],
            (err) => { if (err) console.error('Error inserting user:', err); }
        );

        // Insert courses
        db.run(
            'INSERT OR IGNORE INTO courses (id, title, code, description, credit_hours) VALUES (?, ?, ?, ?, ?)',
            [4, 'Course 4', 'C104', 'Description 4', 5],
            (err) => { if (err) console.error('Error inserting course:', err); }
        );

        // Insert adds
        db.run(
            'INSERT OR IGNORE INTO adds (student_id, course_id, approval_status) VALUES (?, ?, ?)',
            [3, 4, 'pending'],
            (err) => { if (err) console.error('Error inserting add:', err); }
        );

        // Insert drops (assuming add_id 1 exists)
        db.run(
            'INSERT OR IGNORE INTO drops (student_id, course_id, add_id, approval_status) VALUES (?, ?, ?, ?)',
            [1, 1, 1, 'pending'],
            (err) => { if (err) console.error('Error inserting drop:', err); }
        );

        // Verify data
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) console.error('Error selecting users:', err);
            console.log('Users:', rows);
        });
        db.all('SELECT * FROM courses', [], (err, rows) => {
            if (err) console.error('Error selecting courses:', err);
            console.log('Courses:', rows);
        });
        db.all('SELECT * FROM adds', [], (err, rows) => {
            if (err) console.error('Error selecting adds:', err);
            console.log('Adds:', rows);
        });
        db.all('SELECT * FROM drops', [], (err, rows) => {
            if (err) console.error('Error selecting drops:', err);
            console.log('Drops:', rows);
        });
    });

    db.close((err) => {
        if (err) console.error('Error closing database:', err);
        console.log('Database connection closed.');
    });
}

insertData().catch(err => console.error('Error:', err));