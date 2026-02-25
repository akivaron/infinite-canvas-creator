/**
 * @swagger
 * tags:
 *   name: Database Builder
 *   description: Isolated database management with visual editors for tables, columns, indexes, and data
 */

/**
 * @swagger
 * /api/database/create:
 *   post:
 *     summary: Create isolated database
 *     description: Creates a new isolated PostgreSQL schema for a database node
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodeId
 *               - name
 *             properties:
 *               nodeId:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Database created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DatabaseSchema'
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}:
 *   delete:
 *     summary: Delete database
 *     description: Deletes isolated database schema and all data
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Database deleted successfully
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/schema:
 *   get:
 *     summary: Get database schema name
 *     description: Returns the PostgreSQL schema name for a database node
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Schema name retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schemaName:
 *                   type: string
 *       404:
 *         description: Database not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/tables:
 *   get:
 *     summary: List all tables
 *     description: Returns list of all tables in the database
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tables list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tables:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create table
 *     description: Creates a new table with specified columns
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TableSchema'
 *     responses:
 *       200:
 *         description: Table created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/tables/{tableName}:
 *   delete:
 *     summary: Drop table
 *     description: Deletes a table and all its data
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table deleted successfully
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/tables/{tableName}/schema:
 *   get:
 *     summary: Get table schema
 *     description: Returns column definitions for a table
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table schema retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schema:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ColumnSchema'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/tables/{tableName}/columns:
 *   post:
 *     summary: Add column
 *     description: Adds a new column to an existing table
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               column:
 *                 $ref: '#/components/schemas/ColumnSchema'
 *     responses:
 *       200:
 *         description: Column added successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/tables/{tableName}/columns/{columnName}:
 *   delete:
 *     summary: Drop column
 *     description: Removes a column from a table
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: columnName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Column deleted successfully
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/tables/{tableName}/indexes:
 *   post:
 *     summary: Create index
 *     description: Creates an index on specified columns for performance optimization
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - indexName
 *               - columns
 *             properties:
 *               indexName:
 *                 type: string
 *                 description: Name of the index
 *               columns:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of column names to index
 *               unique:
 *                 type: boolean
 *                 description: Whether to create a unique index
 *     responses:
 *       200:
 *         description: Index created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/indexes/{indexName}:
 *   delete:
 *     summary: Drop index
 *     description: Removes an index from the database
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: indexName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Index deleted successfully
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/database/{nodeId}/query:
 *   post:
 *     summary: Execute SQL query
 *     description: Executes raw SQL query in the database
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: SQL query to execute
 *               params:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Query parameters for parameterized queries
 *     responses:
 *       200:
 *         description: Query executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SQLQueryResult'
 *       400:
 *         description: Invalid query
 *       500:
 *         description: Query execution error
 */

/**
 * @swagger
 * /api/database/{nodeId}/tables/{tableName}/data:
 *   get:
 *     summary: Query data
 *     description: Retrieves data from a table with optional filtering, sorting, and pagination
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: Comma-separated list of columns to select
 *       - in: query
 *         name: where
 *         schema:
 *           type: string
 *         description: JSON string of WHERE conditions
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *         description: Column to order by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of rows
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of rows to skip
 *     responses:
 *       200:
 *         description: Data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Query error
 *   post:
 *     summary: Insert data
 *     description: Inserts a new row into a table
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 description: Row data to insert
 *     responses:
 *       200:
 *         description: Data inserted successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Insert error
 *   put:
 *     summary: Update data
 *     description: Updates rows in a table matching WHERE conditions
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - where
 *             properties:
 *               data:
 *                 type: object
 *                 description: Data to update
 *               where:
 *                 type: object
 *                 description: WHERE conditions
 *     responses:
 *       200:
 *         description: Data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rowCount:
 *                   type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Update error
 *   delete:
 *     summary: Delete data
 *     description: Deletes rows from a table matching WHERE conditions
 *     tags: [Database Builder]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - where
 *             properties:
 *               where:
 *                 type: object
 *                 description: WHERE conditions
 *     responses:
 *       200:
 *         description: Data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rowCount:
 *                   type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Delete error
 */

export {};
