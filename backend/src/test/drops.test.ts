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
        db.run('DELETE FROM users');
        db.run('DELETE FROM ids');
        db.run('DELETE FROM courses');
        db.run('DELETE FROM adds');
        db.run('DELETE FROM drops');
        db.run('DELETE FROM sqlite_sequence WHERE name IN ("users", "ids", "courses", "adds", "drops")');
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
    });
    db.close();
    done();
});

beforeEach((done: Done) => {
    const db = new sqlite3.Database('./college.db');
    db.serialize(() => {
        db.run('DELETE FROM adds');
        db.run('DELETE FROM drops');
        db.run('DELETE FROM sqlite_sequence WHERE name IN ("adds", "drops")');
        db.run('INSERT INTO adds (student_id, course_id, approval_status) VALUES (?, ?, ?)', 
            [1, 1, 'approved']);
    });
    db.close();
    done();
});

describe('Drops API', () => {
    it('should create a pending drop for an approved add', (done: Done) => {
        request(app as Express)
            .post('/api/drops')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ add_id: 1 })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('id');
                expect(res.body).to.have.property('add_id', 1);
                expect(res.body).to.have.property('student_id', 1);
                expect(res.body).to.have.property('course_id', 1);
                expect(res.body).to.have.property('approval_status', 'pending');
                done();
            });
    });

    it('should allow registrar to approve a drop', (done: Done) => {
        request(app as Express)
            .post('/api/drops')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ add_id: 1 })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                const dropId = res.body.id;
                request(app as Express)
                    .put(`/api/drops/${dropId}`)
                    .set('Authorization', `Bearer ${registrarToken}`)
                    .send({ approval_status: 'approved' })
                    .expect(200)
                    .end((err, res) => {
                        if (err) return done(err);
                        expect(res.body).to.have.property('message', 'Drop updated');
                        done();
                    });
            });
    });

    it('should get drops for a student', (done: Done) => {
        request(app as Express)
            .post('/api/drops')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ add_id: 1 })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                request(app as Express)
                    .get('/api/drops')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) return done(err);
                        expect(res.body).to.be.an('array');
                        expect(res.body[0]).to.have.property('add_id', 1);
                        done();
                    });
            });
    });

    it('should get all drops for a registrar', (done: Done) => {
        request(app as Express)
            .post('/api/drops')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ add_id: 1 })
            .expect(201)
            .end((err, res) => {
                if (err) return done(err);
                request(app as Express)
                    .get('/api/drops')
                    .set('Authorization', `Bearer ${registrarToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) return done(err);
                        expect(res.body).to.be.an('array');
                        expect(res.body[0]).to.have.property('add_id', 1);
                        done();
                    });
            });
    });
});