const express = require('express');
const router = express.Router();
const db = require('../database');
const adminMiddleware = require('./middlewares/admin');

// ESTADÍSTICAS GENERALES
router.get('/stats', adminMiddleware, (req, res) => {

  const stats = {};

  db.get(`SELECT COUNT(*) as total FROM users`, [], (err, row) => {

    if (err) {
      return res.status(500).json({ error: "Error usuarios" });
    }

    stats.totalUsers = row.total;

    db.get(`SELECT COUNT(*) as total FROM courses`, [], (err, row) => {

      if (err) {
        return res.status(500).json({ error: "Error cursos" });
      }

      stats.totalCourses = row.total;

      db.get(`SELECT COUNT(*) as total FROM user_courses`, [], (err, row) => {

        if (err) {
          return res.status(500).json({ error: "Error asignaciones" });
        }

        stats.totalAssignments = row.total;

        db.get(`SELECT COUNT(*) as total FROM news`, [], (err, row) => {

          if (err) {
            return res.status(500).json({ error: "Error noticias" });
          }

          stats.totalNews = row.total;

          db.all(`
            SELECT tipo, COUNT(*) as total
            FROM news
            GROUP BY tipo
          `, [], (err, rows) => {

            if (err) {
              return res.status(500).json({ error: "Error estadísticas noticias" });
            }

            stats.newsByType = rows;

            db.all(`
              SELECT id, titulo, tipo, fecha
              FROM news
              ORDER BY fecha DESC
              LIMIT 5
            `, [], (err, rows) => {

              if (err) {
                return res.status(500).json({ error: "Error últimas noticias" });
              }

              stats.latestNews = rows;

              db.all(`
                SELECT id, email
                FROM users
                ORDER BY id DESC
                LIMIT 5
              `, [], (err, rows) => {

                if (err) {
                  return res.status(500).json({ error: "Error últimos usuarios" });
                }

                stats.latestUsers = rows;

                db.all(`
                  SELECT id, titulo
                  FROM courses
                  ORDER BY id DESC
                  LIMIT 5
                `, [], (err, rows) => {

                  if (err) {
                    return res.status(500).json({ error: "Error últimos cursos" });
                  }

                  stats.latestCourses = rows;

                  res.json(stats);

                });

              });

            });

          });

        });

      });

    });

  });

});

// ESTADO DEL SISTEMA
router.get('/health', adminMiddleware, (req, res) => {

  res.json({
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date(),
    memoryUsage: process.memoryUsage()
  });

});

// LOGS ADMIN CON PAGINACIÓN, BÚSQUEDA Y FECHAS
router.get('/logs', adminMiddleware, (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const search = req.query.search || "";

  const from = req.query.from || "2000-01-01";
  const to = req.query.to || "2999-12-31";

  const offset = (page - 1) * limit;

  const searchTerm = `%${search}%`;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM admin_logs
    WHERE (
      action LIKE ?
      OR admin_email LIKE ?
    )
    AND date(created_at) BETWEEN date(?) AND date(?)
  `;

  db.get(
    countQuery,
    [searchTerm, searchTerm, from, to],
    (err, countResult) => {

      if (err) {
        return res.status(500).json({ error: "Error al contar logs" });
      }

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      const query = `
        SELECT *
        FROM admin_logs
        WHERE (
          action LIKE ?
          OR admin_email LIKE ?
        )
        AND date(created_at) BETWEEN date(?) AND date(?)
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(
        query,
        [searchTerm, searchTerm, from, to, limit, offset],
        (err, rows) => {

          if (err) {
            return res.status(500).json({ error: "Error al obtener logs" });
          }

          res.json({
            page,
            limit,
            total,
            totalPages,
            search,
            from,
            to,
            data: rows
          });

        }
      );

    }
  );

});

// EXPORTAR LOGS
router.get('/logs/export', adminMiddleware, (req, res) => {

  const query = `
    SELECT *
    FROM admin_logs
    ORDER BY created_at DESC
  `;

  db.all(query, [], (err, rows) => {

    if (err) {
      return res.status(500).json({ error: "Error al exportar logs" });
    }

    let csv = 'id,action,admin_email,created_at\n';

    rows.forEach(log => {
      csv += `${log.id},"${log.action}",${log.admin_email},${log.created_at}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('admin_logs.csv');

    res.send(csv);

  });

});

// BORRAR LOGS
router.delete('/logs', adminMiddleware, (req, res) => {

  db.run(`DELETE FROM admin_logs`, [], function (err) {

    if (err) {
      return res.status(500).json({ error: "Error al borrar logs" });
    }

    res.json({
      mensaje: "Logs eliminados",
      deleted: this.changes
    });

  });

});

module.exports = router;