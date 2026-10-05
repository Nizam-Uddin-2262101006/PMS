const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const requestedPort = Number(process.env.PORT || 3000);
const targetDbName = process.env.PGDATABASE || 'pmisdb';
const baseConnectionString = process.env.DATABASE_URL || 'postgres://postgres:admin@localhost:5432/postgres';
let pool;

function buildConnectionString(dbName) {
  const url = new URL(baseConnectionString);
  url.pathname = `/${dbName}`;
  return url.toString();
}

async function initializeDatabase() {
  const adminPool = new Pool({ connectionString: buildConnectionString('postgres') });

  try {
    await adminPool.query('SELECT 1');
    const { rows } = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName]
    );

    if (rows.length === 0) {
      console.log(`Creating database ${targetDbName}...`);
      await adminPool.query(`CREATE DATABASE "${targetDbName}"`);
    } else {
      console.log(`Database ${targetDbName} already exists`);
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }

  pool = new Pool({ connectionString: buildConnectionString(targetDbName) });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prisoners (
        id SERIAL PRIMARY KEY,
        ref_no TEXT UNIQUE NOT NULL,
        detainee_class TEXT,
        detainee_id TEXT,
        detainee_nature TEXT,
        name_bn TEXT,
        name_en TEXT,
        alias_name TEXT,
        gender TEXT,
        religion TEXT,
        nationality TEXT,
        profession TEXT,
        primary_mobile TEXT,
        alt_mobiles TEXT,
        ident_mark TEXT,
        height TEXT,
        weight INTEGER,
        dob DATE,
        nid TEXT,
        birth_reg_no TEXT,
        passport_no TEXT,
        dl_no TEXT,
        tin TEXT,
        vehicle_reg_no TEXT,
        personal_remarks TEXT,
        current_address JSONB,
        permanent_address JSONB,
        foreign_address JSONB,
        address_remarks TEXT,
        valuables TEXT,
        received_items TEXT,
        internal_report TEXT,
        other_remarks TEXT,
        family_members JSONB,
        education_history JSONB,
        medical_records JSONB,
        call_logs JSONB,
        visitor_logs JSONB,
        transfers JSONB,
        remands JSONB,
        case_records JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log(`Ready to use database ${targetDbName}`);
  } catch (error) {
    console.error('Unable to initialize prisoners table:', error.message);
    throw error;
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/prisoners', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ref_no, detainee_class, name_bn, name_en, gender, primary_mobile, created_at
       FROM prisoners
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching prisoners:', error);
    res.status(500).json({ error: 'ডাটাবেস থেকে লোড করা যায়নি' });
  }
});

app.post('/api/prisoners', async (req, res) => {
  const payload = req.body;
  const now = new Date();
  const detaineeClassValue = payload.detaineeClass || payload.prisonerCategory || payload.detainee_class || null;
  const generateRefNo = () => `PR-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
  const incomingRefNo = payload.refNo || payload.ref_no || '';
  const refNo = (!incomingRefNo || incomingRefNo === 'PR-2026-000000') ? generateRefNo() : incomingRefNo;
  try {
    const query = `
      INSERT INTO prisoners (
        ref_no, detainee_class, detainee_id, detainee_nature, name_bn, name_en, alias_name,
        gender, religion, nationality, profession, primary_mobile, alt_mobiles, ident_mark,
        height, weight, dob, nid, birth_reg_no, passport_no, dl_no, tin, vehicle_reg_no,
        personal_remarks, current_address, permanent_address, foreign_address,
        address_remarks, valuables, received_items, internal_report, other_remarks,
        family_members, education_history, medical_records, call_logs,
        visitor_logs, transfers, remands, case_records, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41
      ) RETURNING id;
    `;

    const values = [
      refNo,
      detaineeClassValue,
      payload.detaineeId || payload.detainee_id || null,
      payload.detaineeNature || payload.detainee_nature || null,
      payload.nameBn || payload.name_bn || null,
      payload.nameEn || payload.name_en || null,
      payload.aliasName || payload.alias_name || null,
      payload.gender || null,
      payload.religion || null,
      payload.nationality || null,
      payload.profession || null,
      payload.primaryMobile || payload.primary_mobile || null,
      payload.altMobiles || payload.alt_mobiles || null,
      payload.identMark || payload.ident_mark || null,
      payload.height || null,
      payload.weight || null,
      payload.dob || null,
      payload.nid || null,
      payload.birthRegNo || payload.birth_reg_no || null,
      payload.passportNo || payload.passport_no || null,
      payload.dlNo || payload.dl_no || null,
      payload.tin || null,
      payload.vahicle || payload.vehicle_reg_no || null,
      payload.personalRemarks || payload.personal_remarks || null,
      JSON.stringify(payload.currentAddress || payload.curAddress || {}),
      JSON.stringify(payload.permanentAddress || payload.permAddress || {}),
      JSON.stringify(payload.foreignAddress || payload.fAddress || {}),
      payload.addressRemarks || payload.address_remarks || null,
      payload.valuableAssets || null,
      payload.receivedItems || null,
      payload.internalReport || null,
      payload.otherRemarks || payload.other_remarks || null,
      JSON.stringify(payload.familyMembers || payload.family_members || []),
      JSON.stringify(payload.educationHistory || payload.education_history || []),
      JSON.stringify(payload.medicalRecords || payload.medical_records || []),
      JSON.stringify(payload.callLogs || payload.call_logs || []),
      JSON.stringify(payload.visitorLogs || payload.visitor_logs || []),
      JSON.stringify(payload.transfers || payload.transfers || []),
      JSON.stringify(payload.remands || payload.remands || []),
      JSON.stringify(payload.caseRecords || payload.case_records || []),
      now,
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error writing prisoner:', error);
    res.status(500).json({ error: 'রিপিডি সংরক্ষণ করতে সমস্যা হয়েছে' });
  }
});

function startServer(port, maxAttempts = 10) {
  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE' && maxAttempts > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Trying ${nextPort} instead...`);
      startServer(nextPort, maxAttempts - 1);
    } else {
      console.error('Server startup failed:', error.message);
      process.exit(1);
    }
  });
}

initializeDatabase()
  .then(() => {
    startServer(requestedPort);
  })
  .catch((error) => {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  });
