import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let userProfilesTableInitialized = false;

async function ensureUserProfilesTable() {
  if (userProfilesTableInitialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      full_name text,
      avatar_url text,
      bio text,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
          AND column_name = 'password_hash'
      ) THEN
        ALTER TABLE user_profiles
        ADD COLUMN password_hash text NOT NULL DEFAULT '';
      END IF;
    END;
    $$;

    CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles(email);
  `);

  userProfilesTableInitialized = true;
}

router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    await ensureUserProfilesTable();
    const existingUser = await pool.query(
      'SELECT id FROM user_profiles WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO user_profiles (id, email, password_hash, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING id, email, created_at`,
      [email, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    await ensureUserProfilesTable();
    const result = await pool.query(
      'SELECT id, email, password_hash, created_at FROM user_profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await ensureUserProfilesTable();
    const result = await pool.query(
      'SELECT id, email, full_name, avatar_url, bio, created_at, updated_at FROM user_profiles WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { full_name, avatar_url, bio } = req.body;

  try {
    await ensureUserProfilesTable();
    const result = await pool.query(
      `UPDATE user_profiles
       SET full_name = $1, avatar_url = $2, bio = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, full_name, avatar_url, bio, created_at, updated_at`,
      [full_name, avatar_url, bio, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
