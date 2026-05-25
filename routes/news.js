const express = require('express');
const router = express.Router();
const db = require('../database');
const adminMiddleware = require('./middlewares/admin');

// OBTENER TODAS LAS NOTICIAS
router.get('/', (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;

  const search = req.query.search || "";
  const tipo = req.query.tipo || "";

  const from = req.query.from || "2000-01-01";
  const to = req.query.to || "2999-12-31";

  const order = req.query.order === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;

  const searchTerm = `%${search}%`;
  const tipoTerm = `%${tipo}%`;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM news
    WHERE (titulo LIKE ? OR contenido LIKE ?)
    AND tipo LIKE ?
    AND date(fecha) BETWEEN date(?) AND date(?)
  `;

  db.get(
    countQuery,
    [searchTerm, searchTerm, tipoTerm, from, to],
    (err, countResult) => {

      if (err) {
        return res.status(500).json({ error: "Error al contar noticias" });
      }

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      const query = `
        SELECT * FROM news
        WHERE (titulo LIKE ? OR contenido LIKE ?)
        AND tipo LIKE ?
        AND date(fecha) BETWEEN date(?) AND date(?)
        ORDER BY fecha ${order}
        LIMIT ? OFFSET ?
      `;

      db.all(
        query,
        [searchTerm, searchTerm, tipoTerm, from, to, limit, offset],
        (err, rows) => {

          if (err) {
            return res.status(500).json({ error: "Error al obtener noticias" });
          }

          res.json({
            page,
            limit,
            total,
            totalPages,
            search,
            tipo,
            from,
            to,
            order,
            data: rows
          });

        }
      );

    }
  );

});

// OBTENER UNA NOTICIA POR ID
router.get('/:id', (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT * FROM news
    WHERE id = ?
  `;

  db.get(query, [id], (err, row) => {

    if (err) {
      return res.status(500).json({ error: "Error al obtener noticia" });
    }

    if (!row) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    res.json(row);

  });

});

// CREAR NOTICIA
router.post('/', adminMiddleware, (req, res) => {

  const { titulo, contenido, tipo } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const query = `
    INSERT INTO news (titulo, contenido, tipo)
    VALUES (?, ?, ?)
  `;

  db.run(query, [titulo, contenido, tipo || 'general'], function (err) {

    if (err) {
      return res.status(500).json({ error: "Error al crear noticia" });
    }

    // LOG ADMIN
    db.run(
      `
      INSERT INTO admin_logs (action, admin_email)
      VALUES (?, ?)
      `,
      [
        `Creó noticia: ${titulo}`,
        req.session.user.email
      ],
      function () {

        // MANTENER SOLO ÚLTIMOS 100 LOGS
        db.run(`
          DELETE FROM admin_logs
          WHERE id NOT IN (
            SELECT id
            FROM admin_logs
            ORDER BY created_at DESC
            LIMIT 100
          )
        `);

      }
    );

    res.json({
      mensaje: "Noticia creada",
      id: this.lastID
    });

  });

});

// EDITAR NOTICIA
router.put('/:id', adminMiddleware, (req, res) => {

  const { id } = req.params;
  const { titulo, contenido, tipo } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const query = `
    UPDATE news
    SET titulo = ?, contenido = ?, tipo = ?
    WHERE id = ?
  `;

  db.run(query, [titulo, contenido, tipo || 'general', id], function (err) {

    if (err) {
      return res.status(500).json({ error: "Error al actualizar noticia" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    res.json({ mensaje: "Noticia actualizada" });

  });

});

// ELIMINAR NOTICIA
router.delete('/:id', adminMiddleware, (req, res) => {

  const { id } = req.params;

  const query = `DELETE FROM news WHERE id = ?`;

  db.run(query, [id], function (err) {

    if (err) {
      return res.status(500).json({ error: "Error al eliminar noticia" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    res.json({ mensaje: "Noticia eliminada" });

  });

});

module.exports = router;