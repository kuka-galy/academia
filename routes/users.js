const express = require('express');
const router = express.Router();
const db = require('../database');

// REGISTRO
router.post('/register', (req, res) => {

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Faltan datos obligatorios (Nombre, Email o Contraseña)"
    });
  }

  const query = `
    INSERT INTO users (name, email, password)
    VALUES (?, ?, ?)
  `;

  db.run(query, [name, email, password], function (err) {

    if (err) {
      console.error("Error SQL al registrar:", err);
      return res.status(500).json({
        error: "Error al registrar usuario en la base de datos"
      });
    }

    res.json({
      mensaje: "Usuario registrado con éxito",
      id: this.lastID
    });

  });

});

// LOGIN
router.post('/login', (req, res) => {

  const { email, password } = req.body;

  const query = `
    SELECT *
    FROM users
    WHERE email = ? AND password = ?
  `;

  db.get(query, [email, password], (err, user) => {

    if (err) {
      return res.status(500).json({
        error: "Error servidor"
      });
    }

    if (!user) {
      return res.status(401).json({
        error: "Credenciales incorrectas"
      });
    }

    // USUARIO BLOQUEADO
    if (user.blocked === 1) {
      return res.status(403).json({
        error: "Usuario bloqueado"
      });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    res.json({
      mensaje: "Login correcto",
      user: req.session.user
    });

  });

});

// LOGOUT
router.post('/logout', (req, res) => {

  req.session.destroy(() => {

    res.json({
      mensaje: "Logout correcto"
    });

  });

});

// PERFIL USUARIO
router.get('/profile', (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({
      error: "No autenticado"
    });
  }

  const query = `
    SELECT id, email, role, blocked
    FROM users
    WHERE id = ?
  `;

  db.get(query, [req.session.user.id], (err, user) => {

    if (err) {
      return res.status(500).json({
        error: "Error servidor"
      });
    }

    if (!user) {
      return res.status(404).json({
        error: "Usuario no encontrado"
      });
    }

    res.json(user);

  });

});

module.exports = router;