-- 完整病历结构化数据库Schema
-- 基于临床试验入排标准设计

-- 1. 患者基本信息表
CREATE TABLE patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    gender VARCHAR(10),
    birth_date DATE,
    age INT,
    id_card VARCHAR(50),
    phone VARCHAR(50),
    address_province VARCHAR(50),
    address_city VARCHAR(50),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    bsa DECIMAL(4,2),
    blood_type VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 诊断信息表
CREATE TABLE diagnoses (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    disease_name_cn VARCHAR(200),
    disease_name_en VARCHAR(200),
    icd10_code VARCHAR(20),
    morphology VARCHAR(100),
    morphology_code VARCHAR(20),
    diagnosis_date DATE,
    diagnosis_method VARCHAR(100),
    diagnosis_hospital VARCHAR(200),
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 分期信息表
CREATE TABLE staging (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    stage_system VARCHAR(50),
    overall_stage VARCHAR(20),
    t_stage VARCHAR(10),
    n_stage VARCHAR(10),
    m_stage VARCHAR(10),
    staging_date DATE,
    clinical_vs_pathological VARCHAR(20),
    has_metastasis BOOLEAN,
    metastasis_sites JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 病理信息表
CREATE TABLE pathology (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    specimen_type VARCHAR(100),
    collection_date DATE,
    histological_type VARCHAR(100),
    differentiation VARCHAR(50),
    lymphovascular_invasion BOOLEAN,
    perineural_invasion BOOLEAN,
    immunohistochemistry JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 分子病理表
CREATE TABLE molecular_markers (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    gene VARCHAR(50),
    test_type VARCHAR(50),  -- mutation, rearrangement, expression
    tested BOOLEAN,
    status VARCHAR(50),  -- positive, negative, unknown
    variant VARCHAR(100),
    test_method VARCHAR(100),
    test_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 治疗史表
CREATE TABLE treatment_history (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    line_number INT,
    treatment_type VARCHAR(50),  -- chemotherapy, targeted, immunotherapy
    regimen_name VARCHAR(200),
    drugs JSONB,
    start_date DATE,
    end_date DATE,
    best_response VARCHAR(20),  -- CR, PR, SD, PD
    progression BOOLEAN,
    discontinuation_reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 体能状态表
CREATE TABLE physical_status (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    assessment_date DATE,
    ecog_score INT,
    kps_score INT,
    presenting_symptoms JSONB,
    current_symptoms JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 实验室检查表
CREATE TABLE laboratory_tests (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    test_date DATE,
    test_type VARCHAR(50),  -- blood_count, liver_function, etc.
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 合并症表
CREATE TABLE comorbidities (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    disease_name VARCHAR(200),
    icd10_code VARCHAR(20),
    control_status VARCHAR(50),
    current_medications JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 禁忌症筛查表
CREATE TABLE contraindications (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    is_pregnant BOOLEAN,
    is_lactating BOOLEAN,
    childbearing_potential BOOLEAN,
    active_infection BOOLEAN,
    severe_organ_dysfunction BOOLEAN,
    screening_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. OCR提取记录表
CREATE TABLE ocr_extractions (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    file_id VARCHAR(100),
    file_type VARCHAR(20),  -- image, pdf
    extracted_data JSONB,
    completeness_score DECIMAL(3,2),
    extraction_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_patients_icd10 ON diagnoses(icd10_code);
CREATE INDEX idx_molecular_gene ON molecular_markers(gene);
CREATE INDEX idx_treatment_patient ON treatment_history(patient_id);
CREATE INDEX idx_lab_tests_date ON laboratory_tests(test_date);