const express = require('express');
const router = express.Router();
const mysqlPool = require('../db/mysql-connection');
const sqliteDb = require('../db/connection');

// GET /api/db-view/tables
router.get('/tables', async (req, res) => {
  const type = req.query.type || 'mysql';
  try {
    if (type === 'mysql') {
      const [rows] = await mysqlPool.query("SHOW TABLES");
      const tables = [];
      for (const r of rows) {
        const tableName = Object.values(r)[0];
        const [countRes] = await mysqlPool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        tables.push({ name: tableName, count: countRes[0].count });
      }
      return res.json({ type: 'MySQL (iicet_ims)', tables });
    } else {
      const tablesRaw = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      const tables = tablesRaw.map(t => {
        try {
          const count = sqliteDb.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get().c;
          return { name: t.name, count };
        } catch(e) {
          return { name: t.name, count: 0 };
        }
      });
      return res.json({ type: 'SQLite (interns.db)', tables });
    }
  } catch (error) {
    console.error('db-view error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/db-view/data/:table
router.get('/data/:table', async (req, res) => {
  const table = req.params.table;
  const type = req.query.type || 'mysql';
  
  // Basic alphanumeric check for security
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  try {
    if (type === 'mysql') {
      const [columns] = await mysqlPool.query(`DESCRIBE \`${table}\``);
      const [rows] = await mysqlPool.query(`SELECT * FROM \`${table}\` LIMIT 200`);
      return res.json({
        type: 'MySQL',
        table,
        columns: columns.map(c => ({ name: c.Field, type: c.Type })),
        rows
      });
    } else {
      const columns = sqliteDb.prepare(`PRAGMA table_info(${table})`).all().map(c => ({ name: c.name, type: c.type }));
      const rows = sqliteDb.prepare(`SELECT * FROM ${table} LIMIT 200`).all();
      return res.json({
        type: 'SQLite',
        table,
        columns,
        rows
      });
    }
  } catch (error) {
    console.error('db-view data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/db-view/ui - Embedded HTML viewer
router.get('/ui', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IICET IMS - Live Database Viewer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 font-sans flex flex-col h-screen">

  <!-- Header -->
  <header class="bg-indigo-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xl shadow">
        <i class="fa-solid fa-database"></i>
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-tight">IICET IMS Database Explorer</h1>
        <p class="text-xs text-indigo-200">Normalized 3NF/BCNF Schema & Live Records Inspector</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <div class="bg-indigo-950 p-1 rounded-lg flex text-sm">
        <button id="btnMysql" onclick="switchDb('mysql')" class="px-3 py-1.5 rounded-md font-medium text-white bg-indigo-600 transition flex items-center gap-1.5 shadow">
          <i class="fa-solid fa-server"></i> MySQL (iicet_ims)
        </button>
        <button id="btnSqlite" onclick="switchDb('sqlite')" class="px-3 py-1.5 rounded-md font-medium text-indigo-300 hover:text-white transition flex items-center gap-1.5">
          <i class="fa-solid fa-file-lines"></i> SQLite (interns.db)
        </button>
      </div>
      <button onclick="loadTables()" class="p-2 text-indigo-200 hover:text-white rounded-lg hover:bg-indigo-800 transition" title="Refresh">
        <i class="fa-solid fa-arrows-rotate"></i>
      </button>
    </div>
  </header>

  <!-- Main Body -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar: Tables List -->
    <aside class="w-72 bg-white border-r border-slate-200 flex flex-col">
      <div class="p-3 border-b border-slate-100 bg-slate-50">
        <input id="searchTable" oninput="filterTables()" type="text" placeholder="Search entity table..." class="w-full text-xs px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
      </div>
      <div class="flex-1 overflow-y-auto p-2" id="tablesList">
        <div class="text-center py-8 text-slate-400 text-sm">Loading tables...</div>
      </div>
      <div class="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <span id="tablesSummary">0 Tables</span>
        <span class="text-emerald-600 font-semibold"><i class="fa-solid fa-circle text-[8px] mr-1"></i>Connected</span>
      </div>
    </aside>

    <!-- Table Viewer / Content -->
    <main class="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      <!-- Top info bar -->
      <div class="bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h2 id="currentTableName" class="text-lg font-bold text-slate-800">Select a Table</h2>
            <span id="currentTableBadge" class="hidden text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200"></span>
          </div>
          <p id="currentTableSubtitle" class="text-xs text-slate-500 mt-0.5">Click any entity on the left to view records</p>
        </div>
        <div class="flex items-center gap-2">
          <input id="searchData" oninput="filterDataRows()" type="text" placeholder="Filter rows in this table..." class="text-xs px-3 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64">
        </div>
      </div>

      <!-- Table Container -->
      <div class="flex-1 overflow-auto p-6" id="tableContent">
        <div class="h-full flex flex-col items-center justify-center text-slate-400">
          <i class="fa-solid fa-table-cells text-5xl mb-3 text-slate-300"></i>
          <p class="text-sm font-medium">No table selected</p>
          <p class="text-xs text-slate-400 mt-1">Select an entity table from the sidebar to inspect records</p>
        </div>
      </div>
    </main>
  </div>

  <script>
    let currentDb = 'mysql';
    let currentTable = null;
    let tablesData = [];
    let currentRows = [];
    let currentColumns = [];

    async function loadTables() {
      const container = document.getElementById('tablesList');
      container.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading entities...</div>';
      try {
        const res = await fetch('/api/db-view/tables?type=' + currentDb);
        const data = await res.json();
        tablesData = data.tables || [];
        renderTables(tablesData);
        document.getElementById('tablesSummary').innerText = tablesData.length + ' Entities';
        if (tablesData.length > 0 && !currentTable) {
          selectTable(tablesData[0].name);
        }
      } catch (err) {
        container.innerHTML = '<div class="p-4 text-xs text-rose-500">Failed to load tables: ' + err.message + '</div>';
      }
    }

    function renderTables(list) {
      const container = document.getElementById('tablesList');
      if (list.length === 0) {
        container.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">No tables found</div>';
        return;
      }
      container.innerHTML = list.map(t => {
        const active = currentTable === t.name;
        return \`
          <button onclick="selectTable('\${t.name}')" class="w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center justify-between text-xs transition \${active ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'text-slate-600 hover:bg-slate-100'}">
            <span class="flex items-center gap-2 truncate">
              <i class="fa-regular fa-folder text-indigo-500 text-[11px]"></i>
              <span class="truncate">\${t.name}</span>
            </span>
            <span class="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full \${t.count > 0 ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'bg-slate-100 text-slate-400'}">\${t.count}</span>
          </button>
        \`;
      }).join('');
    }

    function filterTables() {
      const q = document.getElementById('searchTable').value.toLowerCase();
      const filtered = tablesData.filter(t => t.name.toLowerCase().includes(q));
      renderTables(filtered);
    }

    async function selectTable(name) {
      currentTable = name;
      renderTables(tablesData);
      document.getElementById('currentTableName').innerText = name;
      document.getElementById('currentTableBadge').innerText = currentDb.toUpperCase();
      document.getElementById('currentTableBadge').classList.remove('hidden');
      document.getElementById('currentTableSubtitle').innerText = 'Loading table data...';

      const content = document.getElementById('tableContent');
      content.innerHTML = '<div class="h-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-spinner fa-spin text-3xl mr-3 text-indigo-500"></i> Loading...</div>';

      try {
        const res = await fetch(\`/api/db-view/data/\${name}?type=\${currentDb}\`);
        const data = await res.json();
        currentColumns = data.columns || [];
        currentRows = data.rows || [];
        document.getElementById('currentTableSubtitle').innerText = \`Showing \${currentRows.length} records (\${currentColumns.length} attributes)\`;
        renderTableGrid(currentRows, currentColumns);
      } catch (err) {
        content.innerHTML = '<div class="p-4 bg-rose-50 text-rose-600 rounded-lg text-sm">Failed to load data: ' + err.message + '</div>';
      }
    }

    function renderTableGrid(rows, cols) {
      const content = document.getElementById('tableContent');
      if (rows.length === 0) {
        content.innerHTML = \`
          <div class="h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <i class="fa-regular fa-folder-open text-4xl mb-2 text-slate-300"></i>
            <p class="font-medium text-sm text-slate-600">Table is empty</p>
            <p class="text-xs text-slate-400 mt-1">0 rows stored in \${currentTable}</p>
          </div>
        \`;
        return;
      }

      let html = \`
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto max-h-[calc(100vh-220px)]">
            <table class="w-full text-left text-xs whitespace-nowrap">
              <thead class="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  \${cols.map(c => \`<th class="px-4 py-3 border-r border-slate-100 last:border-r-0">\${c.name} <span class="text-[9px] font-normal text-slate-400 block normal-case">\${c.type || ''}</span></th>\`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                \${rows.map((r, idx) => \`
                  <tr class="hover:bg-indigo-50/40 transition">
                    \${cols.map(c => {
                      let val = r[c.name];
                      if (val === null || val === undefined) {
                        return '<td class="px-4 py-2.5 text-slate-300 italic border-r border-slate-100 last:border-r-0">NULL</td>';
                      }
                      if (typeof val === 'object') {
                        val = JSON.stringify(val);
                      }
                      return \`<td class="px-4 py-2.5 text-slate-700 border-r border-slate-100 last:border-r-0 max-w-xs truncate" title="\${val}">\${val}</td>\`;
                    }).join('')}
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`;
      content.innerHTML = html;
    }

    function filterDataRows() {
      const q = document.getElementById('searchData').value.toLowerCase();
      if (!q) {
        renderTableGrid(currentRows, currentColumns);
        return;
      }
      const filtered = currentRows.filter(row => {
        return Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q));
      });
      renderTableGrid(filtered, currentColumns);
    }

    function switchDb(type) {
      currentDb = type;
      currentTable = null;
      if (type === 'mysql') {
        document.getElementById('btnMysql').className = 'px-3 py-1.5 rounded-md font-medium text-white bg-indigo-600 transition flex items-center gap-1.5 shadow';
        document.getElementById('btnSqlite').className = 'px-3 py-1.5 rounded-md font-medium text-indigo-300 hover:text-white transition flex items-center gap-1.5';
      } else {
        document.getElementById('btnSqlite').className = 'px-3 py-1.5 rounded-md font-medium text-white bg-indigo-600 transition flex items-center gap-1.5 shadow';
        document.getElementById('btnMysql').className = 'px-3 py-1.5 rounded-md font-medium text-indigo-300 hover:text-white transition flex items-center gap-1.5';
      }
      loadTables();
    }

    loadTables();
  </script>
</body>
</html>`);
});

module.exports = router;
