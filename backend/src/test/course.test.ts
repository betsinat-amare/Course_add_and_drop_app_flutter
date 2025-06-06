import { expect } from 'chai';
import request from 'supertest';
import { Express } from 'express';
import app from '../src/index';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { Done } from 'mocha';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'course_add_and_drop';

const studentToken = jwt.sign(
    { id: 1, role: 'Student' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

const registrarToken = jwt.sign(
    { id: 2, role: 'Registrar' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

before((done: Done) => {
    const db = new sqlite3.Database('./college.db');
    db.serialize(() => {
        db.run('INSERT OR IGNORE INTO ids (id, role, assigned) VALUES (?, ?, ?)', [1, 'Student', 1]);
        db.run('INSERT OR IGNORE INTO ids (id, role, assigned) VALUES (?, ?, ?)', [2, 'Registrar', 1]);
        db.run('INSERT OR IGNORE INTO users (id, full_name, username, password, role, email, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [1, 'Test Student', 'teststudent', bcrypt.hashSync('password123', 10), 'Student', 'teststudent@example.com', null]);
        db.run('INSERT OR IGNORE INTO users (id, full_name, username, password, role, email, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [2, 'Test Registrar', 'testregistrar', bcrypt.hashSync('password123', 10), 'Registrar', 'testregistrar@example.com', null]);
        db.run('INSERT OR IGNORE INTO courses (id, title, code, description, credit_hours) VALUES (?, ?, ?, ?, ?)', 
            [1, 'Course 1', 'C101', 'Desc 1', 10]);
        db.run('INSERT OR IGNORE INTO courses (id, title, code, description, credit_hours) VALUES (?, ?, ?, ?, ?)', 
            [2, 'Course 2', 'C102', 'Desc 2', 20]);
        db.run('INSERT OR IGNORE INTO courses (id, title, code, description, credit_hours) VALUES (?, ?, ?, ?, ?)', 
            [3, 'Course 3', 'C103', 'Desc 3', 4]);
    });
    db.close();
    done();
});
describe('Courses API', () => {
    it('should allow registrar to create a course', (done: Done) => {
        request(app as Express)
            .post('/api/courses')
            .set('Authorization', `Bearer ${registrarToken}`)
            .send({
                title: 'New Course',
                code: 'C104',
                description: 'New Description',
                credit_hours: 5
            })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('id');
                expect(res.body.title).to.equal('New Course');
                expect(res.body.code).to.equal('C104');
                expect(res.body.credit_hours).to.equal(5);
                done();
            });
    });

    it('should prevent student from creating a course', (done: Done) => {
        request(app as Express)
            .post('/api/courses')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                title: 'Invalid Course',
                code: 'C105',
                description: 'Invalid Description',
                credit_hours: 5
            })
            .expect(403)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('error', 'Forbidden');
                done();
            });
    });

    it('should get all courses', (done: Done) => {
        request(app as Express)
            .get('/api/courses')
            .set('Authorization', `Bearer ${studentToken}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.be.greaterThan(0);
                expect(res.body[0]).to.have.property('id');
                expect(res.body[0]).to.have.property('title');
                done();
            });
    });
});