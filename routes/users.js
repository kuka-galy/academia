const express = require('express');
const router = express.Router();
const db = require('../database');

// REGISTER
router.post('/register', (req, res) => {
  const { email, password, role, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Faltan datos obligatorios (Email y Contraseña)" });
  }
  const finalName = name ? name.trim() : "Usuario Nuevo";
  const finalRole = (role === 'admin' || role === 'user') ? role : 'user';
  db.run(
    `INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)`,
    [email, password, finalRole, finalName],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al registrar usuario en la base de datos" });

      res.json({
        mensaje: "Usuario registrado con éxito",
        id: this.lastID,
        email,
        name: finalName,
        role: finalRole
      });
    }
  );
});

// LOGIN
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email = ? AND password = ?`,
    [email, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Error en login" });

      if (!row) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      req.session.user = {
        id: row.id,
        email: row.email,
        role: row.role
      };

      res.json({
        mensaje: "Login correcto",
        usuario: req.session.user
      });
    }
  );
});

// USUARIO ACTUAL
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  res.json(req.session.user);
});

// LOGOUT
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ mensaje: "Logout correcto" });
  });
});

// ASIGNAR CURSO
router.post('/assign-course', (req, res) => {
  const { user_id, course_id } = req.body;

  if (!user_id || !course_id) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  db.run(
    `INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)`,
    [user_id, course_id],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al asignar curso" });

      res.json({ mensaje: "Curso asignado correctamente" });
    }
  );
});

// QUITAR CURSO A USUARIO
router.delete('/remove-course', (req, res) => {
  const { user_id, course_id } = req.body;

  if (!user_id || !course_id) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  db.run(
    `DELETE FROM user_courses WHERE user_id = ? AND course_id = ?`,
    [user_id, course_id],
    function (err) {
      if (err) return res.status(500).json({ error: "Error al quitar curso" });

      if (this.changes === 0) {
        return res.status(404).json({ error: "Relación no encontrada" });
      }

      res.json({ mensaje: "Curso eliminado del usuario" });
    }
  );
});

// CURSOS DEL USUARIO
router.get('/my-courses', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const userId = req.session.user.id;

  db.all(
    `
    SELECT courses.*
    FROM courses
    JOIN user_courses ON courses.id = user_courses.course_id
    WHERE user_courses.user_id = ?
    `,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error al obtener cursos" });

      res.json(rows);
    }
  );
});

// TODOS LOS USUARIOS CON SUS CURSOS
router.get('/with-courses', (req, res) => {
  const query = `
    SELECT users.id as user_id, users.email, users.role, users.name, courses.id as course_id, courses.titulo
    FROM users
    LEFT JOIN user_courses ON users.id = user_courses.user_id
    LEFT JOIN courses ON courses.id = user_courses.course_id
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error" });
    const result = {};    
    rows.forEach(row => {
      if (!result[row.user_id]) {
        result[row.user_id] = {
          id: row.user_id,
          email: row.email,
          role: row.role,
          name: row.name,
          courses: []
        };
      }
      if (row.course_id) {
        result[row.user_id].courses.push({ id: row.course_id, titulo: row.titulo });
      }
    });
    res.json(Object.values(result));
  });
});

module.exports = router;