import { Router, Response, NextFunction, Request } from 'express'; // Added Request
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { check, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
// import { AuthenticatedRequest } from '../types'; // Remove this if you define AuthenticatedRequest here
// If AuthenticatedRequest is in '../types', ensure it's compatible with the interface below

const router = Router();

// Extend Request to include the user property
// If you have this defined in '../types', make sure it matches
interface AuthenticatedRequest extends Request {
    user?: { id: number; role: string };
}

// JWT Secret - Use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'course_add_and_drop';

// Authentication Middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Session expired' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user; // Attach the decoded user payload to the request
        next(); // Proceed to the next middleware or route handler
    });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only JPEG and PNG images are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});


const optionalUpload = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    upload.single('profile_photo')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
      
        next();
    });
};

router.post('/signup', optionalUpload, [
    check('id').isInt().withMessage('ID must be an integer'),
    check('full_name').notEmpty().withMessage('Full name is required'),
    check('username').notEmpty().withMessage('Username is required'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    check('email').isEmail().withMessage('Valid email is required'),
    check('role').isIn(['Student', 'Registrar']).withMessage('Role must be Student or Registrar')
], async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id, full_name, username, password, email, role } = req.body;
    const profile_photo = req.file ? req.file.path : null;

    const db = new sqlite3.Database('./college.db');

    db.get('SELECT * FROM ids WHERE id = ? AND role = ? AND assigned = 0', [id, role], async (err, row: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!row) {
            db.close();
            return res.status(400).json({ error: 'Invalid or already assigned ID for the specified role' });
        }

        db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, user: any) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (user) {
                db.close();
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            db.run(
                'INSERT INTO users (id, full_name, username, password, role, email, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, full_name, username, hashedPassword, role, email, profile_photo],
                (err) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: 'Internal server error' });
                    }

                    db.run('UPDATE ids SET assigned = 1 WHERE id = ?', [id], (err) => {
                        if (err) {
                            db.close();
                            return res.status(500).json({ error: 'Internal server error' });
                        }
                        db.close();
                        res.status(201).json({ message: 'User registered successfully' });
                    });
                }
            );
        });
    });
});

router.post('/login', [
    check('username').notEmpty().withMessage('Username is required'),
    check('password').notEmpty().withMessage('Password is required')
], async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    const db = new sqlite3.Database('./college.db');

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            db.close();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            db.close();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET, // Use the defined JWT_SECRET
            { expiresIn: '1h' }
        );

        db.close();
        res.status(200).json({ token, role: user.role, username: user.username }); // Added role and username to login response
    });
});

// Apply authenticateToken middleware to the GET /profile route
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const db = new sqlite3.Database('./college.db');
    const userId = req.user?.id;
    if (!userId){ // This check should ideally not be hit if middleware works
        db.close();
        return res.status(401).json({ error:'Unauthorized' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            db.close();
            return res.status(404).json({ error: 'User not found' });
        }
        db.close();
        // Send the full user object, including full_name, email, and profile_photo
        res.status(200).json(user);
    });
});

// Apply authenticateToken middleware to the PUT /profile route
router.put('/profile', authenticateToken, optionalUpload, async (req: AuthenticatedRequest, res: Response) => {
    const db = new sqlite3.Database('./college.db');
    const userId = req.user?.id;
    if (!userId){ // This check should ideally not be hit if middleware works
        db.close();
        return res.status(401).json({ error:'Unauthorized' });
    }

    const { full_name, username, email, newPassword } = req.body; // Added 'newPassword' from frontend
    const profile_photo = req.file ? req.file.path : null;

    let updateQuery = 'UPDATE users SET full_name = ?, username = ?, email = ?, profile_photo = ? WHERE id = ?';
    let updateParams: (string | null)[] = [full_name, username, email, profile_photo, userId];

    if (newPassword && newPassword.isNotEmpty) { // Check for newPassword and hash it
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateQuery = 'UPDATE users SET full_name = ?, username = ?, email = ?, profile_photo = ?, password = ? WHERE id = ?';
        updateParams = [full_name, username, email, profile_photo, hashedPassword, userId];
    }


    db.run(
        updateQuery,
        updateParams,
        (err) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            db.close();
            res.status(200).json({ message: 'Profile updated successfully' });
        }
    );
});

// Apply authenticateToken middleware to the DELETE /profile route
router.delete('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const db = new sqlite3.Database('./college.db');
    const userId = req.user?.id;
    if (!userId){
        db.close();
        return res.status(401).json({ error:'Unauthorized' });
    }

    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        db.close();
        res.status(200).json({ message: 'Profile deleted successfully' });
    });
});

// Apply authenticateToken middleware to the GET /logout route
router.get('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const db =new sqlite3.Database('./college.db');
    const userId =req.user?.id;
    if (!userId){
        db.close();
        return res.status(401).json({ error:'Unauthorized' });
    }
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user: any) => {
        if (err){
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user){
            db.close();
            return res.status(404).json({error:'User not found' });

        }
        db.close();
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

export default router;