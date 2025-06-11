import { Express } from 'express';
import app from '../src/index';
import { Server } from 'http';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'course_add_and_drop';

console.log(`JWT_SECRET in test setup: ${process.env.JWT_SECRET}`);

let server: Server;

before((done) => {
    server = app.listen(0, () => {
        console.log('Test server started');
        done();
    });
});

after((done) => {
    server.close(() => {
        console.log('Test server closed');
        done();
    });
});