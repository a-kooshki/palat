const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.initialize();
  }

  // Initialize database connection
  initialize() {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        throw err;
      }
      console.log('Connected to SQLite database');
      this.createTables();
    });

    // Handle database close
    process.on('exit', () => {
      if (this.db) {
        this.db.close();
      }
    });
  }

  // Create database tables
  createTables() {
    this.db.serialize(() => {
      // Stones table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS stones (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          cutCode TEXT,
          palletNumber TEXT NOT NULL,
          grade TEXT,
          thickness REAL DEFAULT 0,
          length REAL NOT NULL,
          width REAL NOT NULL,
          quantity INTEGER NOT NULL,
          area REAL NOT NULL,
          invoiceNumber TEXT,
          notes TEXT,
          status TEXT DEFAULT 'In Stock',
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        )
      `);

      // Stone types table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS stone_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
        )
      `);

      // Audit logs table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user TEXT,
          action TEXT NOT NULL,
          entityType TEXT NOT NULL,
          entityId TEXT,
          oldValue TEXT,
          newValue TEXT,
          reason TEXT,
          timestamp TEXT DEFAULT (datetime('now'))
        )
      `);

      // Insert default stone types if not exist
      this.db.get("SELECT COUNT(*) as count FROM stone_types", (err, row) => {
        if (err) {
          console.error('Error checking stone types:', err);
          return;
        }
        if (row.count === 0) {
          const defaultTypes = ['Granite', 'Marble', 'Limestone'];
          const insert = this.db.prepare("INSERT INTO stone_types (name) VALUES (?)");
          defaultTypes.forEach(type => {
            insert.run(type);
          });
          insert.finalize();
        }
      });

      // Create indexes for better performance
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_stones_pallet ON stones(palletNumber)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_stones_type ON stones(type)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_stones_status ON stones(status)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`);
    });
  }

  // ========== STONE OPERATIONS ==========

  // Get all stones
  getAllStones() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM stones ORDER BY createdAt DESC", (err, rows) => {
        if (err) {
          console.error('Error getting all stones:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Add a new stone
  addStone(stone) {
    return new Promise((resolve, reject) => {
      const { id, type, cutCode, palletNumber, grade, thickness, length, width, quantity, area, invoiceNumber, notes, status } = stone;
      
      this.db.run(
        `INSERT INTO stones (id, type, cutCode, palletNumber, grade, thickness, length, width, quantity, area, invoiceNumber, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, type, cutCode, palletNumber, grade, thickness, length, width, quantity, area, invoiceNumber, notes, status],
        function(err) {
          if (err) {
            console.error('Error adding stone:', err);
            reject(err);
          } else {
            // Log the addition
            this.addAuditLog({
              action: 'STONE_ADDED',
              entityType: 'stone',
              entityId: id,
              newValue: JSON.stringify(stone)
            });
            resolve({ id });
          }
        }.bind(this)
      );
    });
  }

  // Update a stone
  updateStone(stone) {
    return new Promise((resolve, reject) => {
      const { id, type, cutCode, palletNumber, grade, thickness, length, width, quantity, area, invoiceNumber, notes, status } = stone;
      
      // First get the old stone for audit logging
      this.db.get("SELECT * FROM stones WHERE id = ?", [id], (err, oldStone) => {
        if (err) {
          console.error('Error getting old stone:', err);
          return reject(err);
        }

        this.db.run(
          `UPDATE stones SET type = ?, cutCode = ?, palletNumber = ?, grade = ?, thickness = ?, length = ?, width = ?, quantity = ?, area = ?, invoiceNumber = ?, notes = ?, status = ?, updatedAt = datetime('now')
           WHERE id = ?`,
          [type, cutCode, palletNumber, grade, thickness, length, width, quantity, area, invoiceNumber, notes, status, id],
          function(err) {
            if (err) {
              console.error('Error updating stone:', err);
              reject(err);
            } else {
              // Log the update
              if (oldStone) {
                this.addAuditLog({
                  action: 'STONE_UPDATED',
                  entityType: 'stone',
                  entityId: id,
                  oldValue: JSON.stringify(oldStone),
                  newValue: JSON.stringify(stone)
                });
              }
              resolve();
            }
          }.bind(this)
        );
      }.bind(this));
    });
  }

  // Delete a stone
  deleteStone(id) {
    return new Promise((resolve, reject) => {
      // First get the stone for audit logging
      this.db.get("SELECT * FROM stones WHERE id = ?", [id], (err, stone) => {
        if (err) {
          console.error('Error getting stone for deletion:', err);
          return reject(err);
        }

        this.db.run("DELETE FROM stones WHERE id = ?", [id], function(err) {
          if (err) {
            console.error('Error deleting stone:', err);
            reject(err);
          } else {
            // Log the deletion
            if (stone) {
              this.addAuditLog({
                action: 'STONE_DELETED',
                entityType: 'stone',
                entityId: id,
                oldValue: JSON.stringify(stone)
              });
            }
            resolve();
          }
        }.bind(this));
      }.bind(this));
    });
  }

  // Save all stones (for bulk operations)
  saveAllStones(stones) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction((err) => {
        if (err) {
          console.error('Transaction error:', err);
          reject(err);
        }
      });

      // Clear existing stones
      transaction.run("DELETE FROM stones", (err) => {
        if (err) {
          console.error('Error clearing stones:', err);
          reject(err);
        }
      });

      // Insert all stones
      const insert = transaction.prepare(
        `INSERT INTO stones (id, type, cutCode, palletNumber, grade, thickness, length, width, quantity, area, invoiceNumber, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      stones.forEach(stone => {
        insert.run(
          [stone.id, stone.type, stone.cutCode, stone.palletNumber, stone.grade, stone.thickness, stone.length, stone.width, stone.quantity, stone.area, stone.invoiceNumber, stone.notes, stone.status]
        );
      });

      insert.finalize((err) => {
        if (err) {
          console.error('Error finalizing insert:', err);
          reject(err);
        } else {
          transaction.commit((err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  // ========== STONE TYPE OPERATIONS ==========

  // Get all stone types
  getAllStoneTypes() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT name FROM stone_types ORDER BY name", (err, rows) => {
        if (err) {
          console.error('Error getting stone types:', err);
          reject(err);
        } else {
          resolve(rows.map(row => row.name));
        }
      });
    });
  }

  // Add a stone type
  addStoneType(type) {
    return new Promise((resolve, reject) => {
      this.db.run("INSERT INTO stone_types (name) VALUES (?)", [type], function(err) {
        if (err) {
          console.error('Error adding stone type:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Delete a stone type
  deleteStoneType(type) {
    return new Promise((resolve, reject) => {
      this.db.run("DELETE FROM stone_types WHERE name = ?", [type], function(err) {
        if (err) {
          console.error('Error deleting stone type:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Save all stone types
  saveStoneTypes(types) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction((err) => {
        if (err) {
          console.error('Transaction error:', err);
          reject(err);
        }
      });

      // Clear existing types
      transaction.run("DELETE FROM stone_types", (err) => {
        if (err) {
          console.error('Error clearing stone types:', err);
          reject(err);
        }
      });

      // Insert all types
      const insert = transaction.prepare("INSERT INTO stone_types (name) VALUES (?)");
      types.forEach(type => {
        insert.run([type]);
      });

      insert.finalize((err) => {
        if (err) {
          console.error('Error finalizing insert:', err);
          reject(err);
        } else {
          transaction.commit((err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  // ========== AUDIT LOG OPERATIONS ==========

  // Add audit log
  addAuditLog(log) {
    return new Promise((resolve, reject) => {
      const { user, action, entityType, entityId, oldValue, newValue, reason } = log;
      
      this.db.run(
        `INSERT INTO audit_logs (user, action, entityType, entityId, oldValue, newValue, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user || 'system', action, entityType, entityId, oldValue, newValue, reason],
        function(err) {
          if (err) {
            console.error('Error adding audit log:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  // Get audit logs
  getAuditLogs(limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) {
            console.error('Error getting audit logs:', err);
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // ========== SEARCH OPERATIONS ==========

  // Search stones with filters
  searchStones(filters) {
    return new Promise((resolve, reject) => {
      const { showSold, type, palletNumber, grade, minLength, maxLength, minWidth, maxWidth, invoiceNumber } = filters;
      
      let query = "SELECT * FROM stones WHERE 1=1";
      const params = [];

      if (!showSold) {
        query += " AND (invoiceNumber IS NULL OR invoiceNumber = '')";
      }

      if (type) {
        query += " AND type = ?";
        params.push(type);
      }

      if (palletNumber) {
        query += " AND palletNumber LIKE ?";
        params.push(`%${palletNumber}%`);
      }

      if (grade) {
        query += " AND grade = ?";
        params.push(grade);
      }

      if (invoiceNumber) {
        query += " AND invoiceNumber = ?";
        params.push(invoiceNumber);
      }

      if (minLength) {
        query += " AND length >= ?";
        params.push(parseFloat(minLength) * 100); // Convert m to cm
      }

      if (maxLength) {
        query += " AND length <= ?";
        params.push(parseFloat(maxLength) * 100); // Convert m to cm
      }

      if (minWidth) {
        query += " AND width >= ?";
        params.push(parseFloat(minWidth) * 100); // Convert m to cm
      }

      if (maxWidth) {
        query += " AND width <= ?";
        params.push(parseFloat(maxWidth) * 100); // Convert m to cm
      }

      query += " ORDER BY palletNumber, createdAt DESC";

      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Error searching stones:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // ========== BACKUP/RESTORE OPERATIONS ==========

  // Create backup
  backup(backupPath) {
    return new Promise((resolve, reject) => {
      try {
        // Ensure backup directory exists
        const dir = path.dirname(backupPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Copy database file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalBackupPath = backupPath || path.join(path.dirname(this.dbPath), `backup_${timestamp}.db`);
        
        fs.copyFileSync(this.dbPath, finalBackupPath);
        
        // Add audit log
        this.addAuditLog({
          action: 'BACKUP_CREATED',
          entityType: 'database',
          newValue: finalBackupPath
        });

        resolve({ path: finalBackupPath });
      } catch (error) {
        console.error('Error creating backup:', error);
        reject(error);
      }
    });
  }

  // Restore from backup
  restore(backupPath) {
    return new Promise((resolve, reject) => {
      try {
        // Close current database connection
        this.db.close();

        // Copy backup file to database location
        fs.copyFileSync(backupPath, this.dbPath);

        // Reinitialize database
        this.initialize();

        // Add audit log
        this.addAuditLog({
          action: 'BACKUP_RESTORED',
          entityType: 'database',
          oldValue: backupPath
        });

        resolve({ path: this.dbPath });
      } catch (error) {
        console.error('Error restoring backup:', error);
        // Reopen database if restore fails
        this.initialize();
        reject(error);
      }
    });
  }

  // Export to JSON
  exportToJSON() {
    return new Promise((resolve, reject) => {
      Promise.all([this.getAllStones(), this.getAllStoneTypes()])
        .then(([stones, stoneTypes]) => {
          const data = { stones, stoneTypes };
          resolve(data);
        })
        .catch(reject);
    });
  }

  // Import from JSON
  importFromJSON(data) {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.saveAllStones(data.stones || []),
        this.saveStoneTypes(data.stoneTypes || ['Granite', 'Marble', 'Limestone'])
      ])
        .then(() => resolve())
        .catch(reject);
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = { Database };
