import { expect } from 'chai';
import request from 'supertest';
import { Express } from 'express';
import app from '../src/index';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import fs from 'fs';
import { Done } from 'mocha';

before((done: Done) => {
    const db = new sqlite3.Database('./college.db');
    db.serialize(() => {
        db.run('DROP TABLE IF EXISTS users');
        db.run('DROP TABLE IF EXISTS ids');
        db.run('DROP TABLE IF EXISTS sqlite_sequence');
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                full_name TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('Student', 'Registrar')),
                email TEXT NOT NULL UNIQUE,
                profile_photo TEXT
            )
        `);
        db.run(`
            CREATE TABLE ids (
                id INTEGER PRIMARY KEY,
                role TEXT NOT NULL CHECK(role IN ('Student', 'Registrar')),
                assigned INTEGER NOT NULL DEFAULT 0 CHECK(assigned IN (0, 1))
            )
        `);
        db.run('INSERT OR IGNORE INTO ids (id, role, assigned) VALUES (?, ?, ?)', [1, 'Student', 1]);
        db.run('INSERT OR IGNORE INTO ids (id, role, assigned) VALUES (?, ?, ?)', [2, 'Registrar', 1]);
        db.run('INSERT OR IGNORE INTO ids (id, role, assigned) VALUES (?, ?, ?)', [3, 'Student', 0]);
        db.run('INSERT OR IGNORE INTO ids (id, role, assigned) VALUES (?, ?, ?)', [4, 'Registrar', 0]);
        const hashedPassword = bcrypt.hashSync('password123', 10);
        db.run(
            'INSERT OR IGNORE INTO users (id, full_name, username, password, role, email, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [1, 'Test Student', 'teststudent', hashedPassword, 'Student', 'teststudent@example.com', null]
        );
        db.run(
            'INSERT OR IGNORE INTO users (id, full_name, username, password, role, email, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [2, 'Test Registrar', 'testregistrar', hashedPassword, 'Registrar', 'testregistrar@example.com', null]
        );
    });
    db.close();
    done();
});

describe('Auth API', () => {
    it('should login a student and return a token', (done: Done) => {
        request(app as Express)
            .post('/api/auth/login')
            .send({
                username: 'teststudent',
                password: 'password123'
            })
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('token');
                done();
            });
    });

    it('should reject invalid credentials', (done: Done) => {
        request(app as Express)
            .post('/api/auth/login')
            .send({
                username: 'teststudent',
                password: 'wrongpassword'
            })
            .expect(401)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('error', 'Invalid credentials');
                done();
            });
    });

    it('should sign up a new student', (done: Done) => {
        request(app as Express)
            .post('/api/auth/signup')
            .field('id', '3')
            .field('full_name', 'New Student')
            .field('username', 'newstudent')
            .field('password', 'password123')
            .field('email', 'newstudent@example.com')
            .field('role', 'Student')
            .attach('profile_photo', fs.createReadStream('test/test-image.jpg'))
            .expect(201)
            .end((err, res) => {
                if (err) {
                    console.log('Signup student error:', res.body);
                    return done(err);
                }
                expect(res.body).to.have.property('message', 'User registered successfully');
                done();
            });
    });

    it('should sign up a new registrar', (done: Done) => {
        request(app as Express)
            .post('/api/auth/signup')
            .field('id', '4')
            .field('full_name', 'New Registrar')
            .field('username', 'newregistrar')
            .field('password', 'password123')
            .field('email', 'newregistrar@example.com')
            .field('role', 'Registrar')
            .attach('profile_photo', fs.createReadStream('test/test-image.jpg'))
            .expect(201)
            .end((err, res) => {
                if (err) {
                    console.log('Signup registrar error:', res.body);
                    return done(err);
                }
                expect(res.body).to.have.property('message', 'User registered successfully');
                done();
            });
    });
});