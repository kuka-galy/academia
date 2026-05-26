const express = require('express');
const router = express.Router();
const db = require('../database');
const adminMiddleware = require('./middlewares/admin');



// =============================
// DASHBOARD
// =============================

router.get('/dashboard', adminMiddleware, (req, res) => {

  const dashboard = {};

  db.all(`
    SELECT id, email, role
    FROM users
    ORDER BY id DESC
    LIMIT 5
  `, [], (err, users) => {

    if (err) {
      return res.status(500).json({
        error: "Error usuarios recientes"
      });
    }

    dashboard.latestUsers = users;

    db.all(`
      SELECT id, titulo
      FROM courses
      ORDER BY id DESC
      LIMIT 5
    `, [], (err, courses) => {

      if (err) {
        return res.status(500).json({
          error: "Error cursos recientes"
        });
      }

      dashboard.latestCourses = courses;

      db.all(`
        SELECT id, titulo, tipo, fecha
        FROM news
        ORDER BY id DESC
        LIMIT 5
      `, [], (err, news) => {

        if (err) {
          return res.status(500).json({
            error: "Error noticias recientes"
          });
        }

        dashboard.latestNews = news;

        db.all(`
          SELECT id, action, admin_email, created_at
          FROM admin_logs
          ORDER BY id DESC
          LIMIT 10
        `, [], (err, logs) => {

          if (err) {
            return res.status(500).json({
              error: "Error logs recientes"
            });
          }

          dashboard.latestLogs = logs;

          res.json(dashboard);

        });

      });

    });

  });

});



// =============================
// TOP CURSOS
// =============================

router.get('/courses/top', adminMiddleware, (req, res) => {

  const limit = parseInt(req.query.limit) || 5;

  const query = `
    SELECT
      courses.id,
      courses.titulo,
      COUNT(user_courses.user_id) as totalUsers
    FROM courses
    LEFT JOIN user_courses
      ON courses.id = user_courses.course_id
    GROUP BY courses.id
    ORDER BY totalUsers DESC
    LIMIT ?
  `;

  db.all(query, [limit], (err, rows) => {

    if (err) {
      return res.status(500).json({
        error: "Error al obtener top cursos"
      });
    }

    res.json({
      total: rows.length,
      data: rows
    });

  });

});



// =============================
// STATS CURSOS
// =============================

router.get('/courses/stats', adminMiddleware, (req, res) => {

  const query = `
    SELECT
      courses.id,
      courses.titulo,
      COUNT(user_courses.user_id) as totalUsers
    FROM courses
    LEFT JOIN user_courses
      ON courses.id = user_courses.course_id
    GROUP BY courses.id
    ORDER BY totalUsers DESC
  `;

  db.all(query, [], (err, rows) => {

    if (err) {
      return res.status(500).json({
        error: "Error al obtener estadísticas"
      });
    }

    res.json({
      total: rows.length,
      data: rows
    });

  });

});



// =============================
// ASIGNAR CURSO
// =============================

router.post('/users/:userId/courses/:courseId', adminMiddleware, (req, res) => {

  const { userId, courseId } = req.params;

  db.get(`
    SELECT *
    FROM user_courses
    WHERE user_id = ?
    AND course_id = ?
  `,
  [userId, courseId],
  (err, existing) => {

    if (err) {
      return res.status(500).json({
        error: "Error al comprobar asignación"
      });
    }

    if (existing) {
      return res.status(400).json({
        error: "El usuario ya tiene este curso"
      });
    }

    db.run(`
      INSERT INTO user_courses (user_id, course_id)
      VALUES (?, ?)
    `,
    [userId, courseId],
    function (err) {

      if (err) {
        return res.status(500).json({
          error: "Error al asignar curso"
        });
      }

      db.run(`
        INSERT INTO admin_logs (action, admin_email)
        VALUES (?, ?)
      `,
      [
        `Asignó curso ${courseId} a usuario ${userId}`,
        req.session.user.email
      ]);

      res.json({
        mensaje: "Curso asignado correctamente",
        id: this.lastID
      });

    });

  });

});



// =============================
// QUITAR CURSO
// =============================

router.delete('/users/:userId/courses/:courseId', adminMiddleware, (req, res) => {

  const { userId, courseId } = req.params;

  db.run(`
    DELETE FROM user_courses
    WHERE user_id = ?
    AND course_id = ?
  `,
  [userId, courseId],
  function (err) {

    if (err) {
      return res.status(500).json({
        error: "Error al quitar curso"
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Asignación no encontrada"
      });
    }

    db.run(`
      INSERT INTO admin_logs (action, admin_email)
      VALUES (?, ?)
    `,
    [
      `Quitó curso ${courseId} a usuario ${userId}`,
      req.session.user.email
    ]);

    res.json({
      mensaje: "Curso eliminado del usuario"
    });

  });

});



// =============================
// VER CURSOS DE USUARIO
// =============================

router.get('/users/:id/courses', adminMiddleware, (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT
      courses.id,
      courses.titulo,
      courses.descripcion,
      courses.imagen
    FROM user_courses
    INNER JOIN courses
      ON user_courses.course_id = courses.id
    WHERE user_courses.user_id = ?
    ORDER BY courses.id DESC
  `;

  db.all(query, [id], (err, rows) => {

    if (err) {
      return res.status(500).json({
        error: "Error al obtener cursos del usuario"
      });
    }

    res.json({
      total: rows.length,
      data: rows
    });

  });

});



// =============================
// VER USUARIOS DE CURSO
// =============================

router.get('/courses/:id/users', adminMiddleware, (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT
      users.id,
      users.email,
      users.role,
      users.blocked
    FROM user_courses
    INNER JOIN users
      ON user_courses.user_id = users.id
    WHERE user_courses.course_id = ?
    ORDER BY users.id DESC
  `;

  db.all(query, [id], (err, rows) => {

    if (err) {
      return res.status(500).json({
        error: "Error al obtener usuarios del curso"
      });
    }

    res.json({
      total: rows.length,
      data: rows
    });

  });

});



// =============================
// LISTAR CURSOS
// =============================

router.get('/courses', adminMiddleware, (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const search = req.query.search || "";

  const offset = (page - 1) * limit;

  const searchTerm = `%${search}%`;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM courses
    WHERE titulo LIKE ?
    OR descripcion LIKE ?
  `;

  const query = `
    SELECT *
    FROM courses
    WHERE titulo LIKE ?
    OR descripcion LIKE ?
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;

  db.get(countQuery, [searchTerm, searchTerm], (err, countResult) => {

    if (err) {
      return res.status(500).json({
        error: "Error al contar cursos"
      });
    }

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    db.all(
      query,
      [searchTerm, searchTerm, limit, offset],
      (err, rows) => {

        if (err) {
          return res.status(500).json({
            error: "Error al obtener cursos"
          });
        }

        res.json({
          page,
          limit,
          total,
          totalPages,
          search,
          data: rows
        });

      }
    );

  });

});



// =============================
// LISTAR USUARIOS
// =============================

router.get('/users', adminMiddleware, (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const search = req.query.search || "";

  const blocked =
    req.query.blocked === "1"
      ? 1
      : req.query.blocked === "0"
      ? 0
      : null;

  const offset = (page - 1) * limit;

  const searchTerm = `%${search}%`;

  let countQuery = `
    SELECT COUNT(*) as total
    FROM users
    WHERE email LIKE ?
  `;

  let usersQuery = `
    SELECT id, email, role, blocked
    FROM users
    WHERE email LIKE ?
  `;

  const params = [searchTerm];

  if (blocked !== null) {
    countQuery += ` AND blocked = ?`;
    usersQuery += ` AND blocked = ?`;
    params.push(blocked);
  }

  usersQuery += `
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;

  db.get(countQuery, params, (err, countResult) => {

    if (err) {
      return res.status(500).json({
        error: "Error al contar usuarios"
      });
    }

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    db.all(
      usersQuery,
      [...params, limit, offset],
      (err, rows) => {

        if (err) {
          return res.status(500).json({
            error: "Error al obtener usuarios"
          });
        }

        res.json({
          page,
          limit,
          total,
          totalPages,
          search,
          blocked,
          data: rows
        });

      }
    );

  });

});



// =============================
// CAMBIAR ROL
// =============================

router.put('/users/:id/role', adminMiddleware, (req, res) => {

  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({
      error: "Rol inválido"
    });
  }

  db.run(`
    UPDATE users
    SET role = ?
    WHERE id = ?
  `,
  [role, id],
  function (err) {

    if (err) {
      return res.status(500).json({
        error: "Error al cambiar rol"
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Usuario no encontrado"
      });
    }

    db.run(`
      INSERT INTO admin_logs (action, admin_email)
      VALUES (?, ?)
    `,
    [
      `Cambió rol usuario ID ${id} a ${role}`,
      req.session.user.email
    ]);

    res.json({
      mensaje: "Rol actualizado"
    });

  });

});



// =============================
// BLOQUEAR USUARIO
// =============================

router.put('/users/:id/block', adminMiddleware, (req, res) => {

  const { id } = req.params;

  db.run(`
    UPDATE users
    SET blocked = 1
    WHERE id = ?
  `,
  [id],
  function (err) {

    if (err) {
      return res.status(500).json({
        error: "Error al bloquear usuario"
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Usuario no encontrado"
      });
    }

    db.run(`
      INSERT INTO admin_logs (action, admin_email)
      VALUES (?, ?)
    `,
    [
      `Bloqueó usuario ID ${id}`,
      req.session.user.email
    ]);

    res.json({
      mensaje: "Usuario bloqueado"
    });

  });

});



// =============================
// DESBLOQUEAR USUARIO
// =============================

router.put('/users/:id/unblock', adminMiddleware, (req, res) => {

  const { id } = req.params;

  db.run(`
    UPDATE users
    SET blocked = 0
    WHERE id = ?
  `,
  [id],
  function (err) {

    if (err) {
      return res.status(500).json({
        error: "Error al desbloquear usuario"
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Usuario no encontrado"
      });
    }

    db.run(`
      INSERT INTO admin_logs (action, admin_email)
      VALUES (?, ?)
    `,
    [
      `Desbloqueó usuario ID ${id}`,
      req.session.user.email
    ]);

    res.json({
      mensaje: "Usuario desbloqueado"
    });

  });

});



// =============================
// ELIMINAR USUARIO
// =============================

router.delete('/users/:id', adminMiddleware, (req, res) => {

  const { id } = req.params;

  db.run(`
    DELETE FROM user_courses
    WHERE user_id = ?
  `,
  [id],
  (err) => {

    if (err) {
      return res.status(500).json({
        error: "Error al borrar asignaciones"
      });
    }

    db.run(`
      DELETE FROM users
      WHERE id = ?
    `,
    [id],
    function (err) {

      if (err) {
        return res.status(500).json({
          error: "Error al borrar usuario"
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          error: "Usuario no encontrado"
        });
      }

      db.run(`
        INSERT INTO admin_logs (action, admin_email)
        VALUES (?, ?)
      `,
      [
        `Eliminó usuario ID ${id}`,
        req.session.user.email
      ]);

      res.json({
        mensaje: "Usuario eliminado"
      });

    });

  });

});



// =============================
// STATS GENERALES
// =============================

router.get('/stats', adminMiddleware, (req, res) => {

  const stats = {};

  db.get(`
    SELECT COUNT(*) as total
    FROM users
  `,
  [],
  (err, row) => {

    if (err) {
      return res.status(500).json({
        error: "Error usuarios"
      });
    }

    stats.totalUsers = row.total;

    db.get(`
      SELECT COUNT(*) as total
      FROM users
      WHERE blocked = 1
    `,
    [],
    (err, row) => {

      if (err) {
        return res.status(500).json({
          error: "Error usuarios bloqueados"
        });
      }

      stats.blockedUsers = row.total;

      db.get(`
        SELECT COUNT(*) as total
        FROM courses
      `,
      [],
      (err, row) => {

        if (err) {
          return res.status(500).json({
            error: "Error cursos"
          });
        }

        stats.totalCourses = row.total;

        db.get(`
          SELECT COUNT(*) as total
          FROM user_courses
        `,
        [],
        (err, row) => {

          if (err) {
            return res.status(500).json({
              error: "Error asignaciones"
            });
          }

          stats.totalAssignments = row.total;

          db.get(`
            SELECT COUNT(*) as total
            FROM news
          `,
          [],
          (err, row) => {

            if (err) {
              return res.status(500).json({
                error: "Error noticias"
              });
            }

            stats.totalNews = row.total;

            res.json(stats);

          });

        });

      });

    });

  });

});



// =============================
// HEALTH
// =============================

router.get('/health', adminMiddleware, (req, res) => {

  res.json({
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date(),
    memoryUsage: process.memoryUsage()
  });

});

module.exports = router;