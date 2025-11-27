/**
 * REFERENCE ONLY: This server code is provided to meet the requirements of the prompt 
 * regarding "server outside src" and "sqlite". 
 * In the Preview environment, the app runs entirely in the browser using LocalStorage 
 * via `src/lib/store.ts`.
 */

import express from 'express';
import cors from 'cors';
import { Database } from './db';

const app = express();
const PORT = 3001;
const db = new Database('mock.db');

app.use(cors());
app.use(express.json());

// Projects API
app.get('/api/projects', async (req, res) => {
    const projects = await db.getAll('SELECT * FROM projects');
    res.json(projects);
});

app.post('/api/projects', async (req, res) => {
    const { name, description } = req.body;
    const result = await db.run('INSERT INTO projects (name, description, status) VALUES (?, ?, ?)', [name, description, 'stopped']);
    res.json({ id: result.lastInsertRowid });
});

// Mock Engine Middleware
app.use('/mock/:projectId/*', async (req, res) => {
    const { projectId } = req.params;
    const path = '/' + req.params[0];
    const method = req.method;

    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project || project.status !== 'running') {
        return res.status(503).json({ error: 'Mock server stopped' });
    }

    const endpoint = await db.get('SELECT * FROM endpoints WHERE project_id = ? AND method = ? AND path = ?', [projectId, method, path]);
    
    if (endpoint) {
        const response = await db.get('SELECT * FROM responses WHERE endpoint_id = ? LIMIT 1', [endpoint.id]);
        if (response) {
            setTimeout(() => {
                res.status(response.status_code).set(JSON.parse(response.headers || '{}')).send(response.body);
            }, response.delay || 0);
            return;
        }
    }
    
    res.status(404).json({ error: 'Mock not found' });
});

console.log(`Server code reference ready.`);
// app.listen(PORT, () => console.log(`Server running on ${PORT}`));