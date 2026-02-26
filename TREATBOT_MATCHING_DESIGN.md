# Treatbot 患者临床数据模型与匹配算法设计

> 版本: v1.0  
> 日期: 2026-02-26  
> 后端API: http://49.235.162.129:3000

---

## 一、患者临床信息字段体系

### 1.1 核心实体关系

```
Patient（患者）
  └── MedicalRecord（病历）
       ├── BasicInfo（基本信息）
       ├── Diagnosis（诊断信息）
       ├── Genomics（基因信息）
       ├── TreatmentHistory（治疗史）
       ├── PhysicalStatus（体能状态）
       └── LabResults（实验室检查）
```

### 1.2 完整字段定义（前端需要收集的数据）

#### 🔹 必填字段（匹配算法必需）

| 字段名 | 类型 | 权重 | 说明 | 示例 |
|--------|------|------|------|------|
| **primaryCancer** | object | 25% | 原发癌种 | {code: "C34", name: "肺恶性肿瘤"} |
| **histology** | object | 15% | 组织学类型 | {code: "ADC", name: "腺癌"} |
| **stage** | object | 20% | TNM分期 | {overall: "IIIB", t: "T3", n: "N2", m: "M0"} |
| **treatmentLines** | number | 15% | 已接受治疗线数 | 2 |
| **ecogScore** | number | 10% | ECOG体能评分 | 0-4 |
| **mutations** | array | 15% | 基因突变列表 | [{gene: "EGFR", variant: "L858R"}] |

#### 🔹 选填字段（提升匹配精度）

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| city | string | 所在城市 | "上海" |
| province | string | 所在省份 | "上海市" |
| age | number | 年龄 | 55 |
| gender | enum | 性别 | "male"/"female" |
| biomarkers | object | 生物标志物 | {pdL1: "50%", tmb: "high"} |
| priorDrugs | array | 既往用药 | ["培美曲塞", "卡铂"] |
| metastasisSites | array | 转移部位 | ["bone", "liver"] |

---

## 二、智能匹配算法

### 2.1 匹配分数计算（总分100分）

```
匹配分数 = Σ(维度得分 × 维度权重)

维度权重分配：
├── 癌种匹配: 25分
├── 分期匹配: 20分
├── 基因突变: 15分
├── 治疗线数: 15分
├── 体能状态: 10分
├── 地理位置: 10分
└── 其他因素: 5分
```

### 2.2 各维度评分逻辑

#### 1) 癌种匹配 (25分)
```javascript
if (患者癌种 === 试验癌种) {
    score = 25;  // 精确匹配
} else if (患者癌种是试验癌种的亚型) {
    score = 20;  // 亚型匹配
} else if (同一大类癌症) {
    score = 10;  // 大类匹配
} else {
    score = 0;   // 不匹配
}
```

#### 2) 分期匹配 (20分)
```javascript
if (患者分期 in 试验接受分期范围) {
    // 越靠近试验目标分期，分数越高
    score = 20 - (分期差距 × 2);
} else {
    score = 0;  // 不接受该分期
}
```

#### 3) 基因突变匹配 (15分)
```javascript
if (试验需要特定突变) {
    if (患者有该突变) {
        score = 15;  // 完美匹配
    } else if (患者有同通路其他突变) {
        score = 8;   // 部分匹配
    } else {
        score = 0;   // 不匹配
    }
}
```

#### 4) 治疗线数 (15分)
```javascript
if (患者线数 >= 试验要求最小线数 && 患者线数 <= 试验要求最大线数) {
    score = 15;
} else if (接近要求范围) {
    score = 10;  // 接近匹配
} else {
    score = 0;   // 不符合
}
```

#### 5) 体能状态 (10分)
```javascript
if (患者ECOG <= 试验要求最大ECOG) {
    score = 10;
} else if (ECOG差距 <= 1) {
    score = 5;
} else {
    score = 0;
}
```

#### 6) 地理位置 (10分)
```javascript
if (同城有研究中心) {
    score = 10;
} else if (同省有研究中心) {
    score = 7;
} else if (周边省市有中心) {
    score = 4;
} else {
    score = 1;  // 全国多中心
}
```

### 2.3 匹配等级划分

| 分数 | 等级 | 说明 | 建议动作 |
|------|------|------|----------|
| ≥85分 | ⭐⭐⭐ 高度匹配 | 非常符合条件 | 强烈推荐报名 |
| 70-84分 | ⭐⭐ 中度匹配 | 基本符合条件 | 建议报名评估 |
| 55-69分 | ⭐ 低度匹配 | 部分符合条件 | 需进一步评估 |
| <55分 | ❌ 不匹配 | 不符合主要条件 | 寻找其他试验 |

---

## 三、缺失字段补齐流程

### 3.1 缺失字段检测算法

```javascript
function detectMissingFields(patientData, schema) {
    const missingFields = [];
    
    for (const [fieldKey, fieldDef] of Object.entries(schema)) {
        // 检查条件必填
        let isRequired = fieldDef.required;
        if (fieldDef.required === 'conditional') {
            isRequired = fieldDef.condition(patientData);
        }
        
        if (!isRequired) continue;
        
        // 检查字段值
        const value = getNestedValue(patientData, fieldKey);
        if (isEmpty(value)) {
            missingFields.push({
                fieldKey,
                label: fieldDef.label,
                dataType: fieldDef.type,
                required: true,
                options: fieldDef.options,
                validationRule: fieldDef.validation
            });
        }
    }
    
    return missingFields;
}
```

### 3.2 补齐字段优先级

| 优先级 | 字段 | 原因 |
|--------|------|------|
| P0 | 癌种、分期 | 匹配算法核心 |
| P0 | 治疗线数 | 入组关键条件 |
| P1 | 基因突变 | 靶向治疗必需 |
| P1 | ECOG评分 | 体能状态评估 |
| P2 | 既往用药 | 排除标准检查 |
| P2 | 转移部位 | 分期确认 |
| P3 | 实验室指标 | 安全性评估 |
| P3 | 合并症 | 排除标准 |

### 3.3 结构化问答表单设计

对于每个缺失字段，生成对应的表单组件：

```javascript
// 字段类型 → 表单组件映射
const FIELD_TYPE_COMPONENTS = {
    'string': 'TextInput',      // 文本输入
    'number': 'NumberInput',    // 数字输入
    'enum': 'RadioGroup',       // 单选
    'array': 'CheckboxGroup',   // 多选
    'date': 'DatePicker',       // 日期选择
    'object': 'NestedForm'      // 嵌套表单
};

// 示例：分期字段表单
{
    fieldKey: 'diagnosis.stage.overall',
    label: '临床分期',
    component: 'RadioGroup',
    options: [
        {value: 'IA', label: 'IA期'},
        {value: 'IB', label: 'IB期'},
        {value: 'IIA', label: 'IIA期'},
        {value: 'IIB', label: 'IIB期'},
        {value: 'IIIA', label: 'IIIA期'},
        {value: 'IIIB', label: 'IIIB期'},
        {value: 'IIIC', label: 'IIIC期'},
        {value: 'IVA', label: 'IVA期'},
        {value: 'IVB', label: 'IVB期'}
    ],
    required: true,
    helpText: '请根据最新影像学检查选择当前分期'
}
```

---

## 四、API接口设计

### 4.1 核心API端点

```
POST /api/v1/patients/register          # 注册患者
POST /api/v1/medical-records            # 创建病历
PATCH /api/v1/medical-records/:id       # 更新病历
POST /api/v1/medical-records/:id/enrich # 补齐字段

POST /api/v1/matches/find               # 查找匹配试验 ⭐核心
GET  /api/v1/matches/:matchId           # 获取匹配详情
POST /api/v1/applications               # 提交报名申请
```

### 4.2 匹配API详细设计

**请求：**
```http
POST /api/v1/matches/find
Content-Type: application/json

{
    "patientId": "P202402260001",
    "medicalRecordId": "MR202402260001",
    // 或使用完整患者数据
    "patientData": {
        "disease": "非小细胞肺癌",
        "stage": "IIIB",
        "city": "上海",
        "geneMutation": "EGFR L858R",
        "treatmentLine": 2,
        "ecogScore": 1,
        "priorDrugs": ["化疗", "免疫治疗"]
    },
    "filters": {
        "maxDistance": 500,      // 最大距离(km)
        "phases": ["III期"],      // 试验阶段筛选
        "status": "recruiting"    // 招募状态
    }
}
```

**响应：**
```json
{
    "success": true,
    "data": {
        "total": 156,
        "filtered": 23,
        "matches": [
            {
                "matchId": "M202402260001",
                "trial": {
                    "trialId": "T001",
                    "nctId": "NCT06361116",
                    "title": "卡瑞利珠单抗联合化疗用于晚期NSCLC",
                    "indication": "非小细胞肺癌",
                    "phase": "III期",
                    "location": ["上海", "北京", "广州"],
                    "hospitals": [
                        {"name": "复旦大学附属肿瘤医院", "city": "上海"}
                    ],
                    "sponsor": "恒瑞医药"
                },
                "matchResult": {
                    "score": 92,
                    "level": "高度匹配",
                    "breakdown": {
                        "diagnosis": 25,
                        "stage": 18,
                        "genomics": 15,
                        "treatment": 15,
                        "physical": 10,
                        "location": 9
                    },
                    "reasons": [
                        "✓ 癌种精确匹配（肺恶性肿瘤）",
                        "✓ 分期符合要求（IIIB期）",
                        "✓ 基因突变匹配（EGFR L858R）",
                        "✓ 治疗线数符合（2线）",
                        "✓ 同城有研究中心",
                        "✓ 体能状态良好（ECOG 1分）"
                    ]
                },
                "eligibility": {
                    "status": "likely_eligible",
                    "confidence": 0.92,
                    "missingInfo": [],
                    "warnings": []
                },
                "recommendation": {
                    "action": "strong_apply",
                    "message": "高度匹配，建议尽快联系研究中心",
                    "nextSteps": ["查看完整入排标准", "准备病历资料", "联系研究中心"]
                }
            }
        ],
        "summary": {
            "highMatches": 5,    // ≥85分
            "mediumMatches": 12, // 70-84分
            "lowMatches": 6,     // 55-69分
            "incompleteData": 3  // 数据不完整无法评估
        }
    }
}
```

---

## 五、前端实现要点

### 5.1 数据收集表单

```javascript
// pages/patient-info/patient-info.js

Page({
    data: {
        // 步骤管理
        currentStep: 0,
        totalSteps: 5,
        
        // 患者数据
        patientData: {
            basicInfo: {},
            diagnosis: {},
            genomics: {},
            treatmentHistory: {},
            physicalStatus: {}
        },
        
        // 表单配置（动态生成）
        formFields: [],
        
        // 缺失字段
        missingFields: [],
        
        // 匹配结果
        matchResults: []
    },
    
    onLoad() {
        // 加载schema配置
        this.loadSchema();
        
        // 检测已有数据的缺失字段
        this.detectMissingFields();
    },
    
    // 动态生成表单字段
    generateFormFields() {
        const schema = CLINICAL_SCHEMA;
        const fields = [];
        
        for (const [category, categoryFields] of Object.entries(schema)) {
            for (const [fieldKey, fieldDef] of Object.entries(categoryFields)) {
                fields.push({
                    ...fieldDef,
                    fieldKey: `${category}.${fieldKey}`,
                    value: getNestedValue(this.data.patientData, `${category}.${fieldKey}`)
                });
            }
        }
        
        this.setData({ formFields: fields });
    },
    
    // 提交数据进行匹配
    async submitAndMatch() {
        const { patientData } = this.data;
        
        wx.showLoading({ title: '正在匹配试验...' });
        
        try {
            const result = await findMatchingTrials(patientData);
            
            this.setData({
                matchResults: result.matches,
                currentStep: this.data.totalSteps - 1  // 跳转到结果页
            });
            
        } catch (error) {
            wx.showToast({ title: '匹配失败', icon: 'none' });
        } finally {
            wx.hideLoading();
        }
    }
});
```

### 5.2 匹配结果展示

```javascript
// components/match-card/match-card.js

Component({
    properties: {
        match: {
            type: Object,
            value: {}
        }
    },
    
    methods: {
        // 查看详情
        viewDetail() {
            const { trial } = this.data.match;
            wx.navigateTo({
                url: `/pages/trial-detail/trial-detail?id=${trial.trialId}`
            });
        },
        
        // 一键报名
        applyNow() {
            const { matchId } = this.data.match;
            wx.navigateTo({
                url: `/pages/apply/apply?matchId=${matchId}`
            });
        },
        
        // 分享试验
        shareTrial() {
            // 生成分享卡片
        }
    }
});
```

---

## 六、后端实现要点

### 6.1 数据库表设计

```sql
-- 患者表
CREATE TABLE patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    phone_masked VARCHAR(20),
    phone_encrypted TEXT,
    real_name VARCHAR(100),
    id_card_masked VARCHAR(20),
    gender ENUM('male', 'female'),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 病历表
CREATE TABLE medical_records (
    record_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50),
    diagnosis JSON,          -- 诊断信息（JSON存储）
    genomics JSON,           -- 基因信息
    treatment_history JSON,  -- 治疗史
    physical_status JSON,    -- 体能状态
    lab_results JSON,        -- 实验室检查
    completeness DECIMAL(5,2),
    missing_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 临床试验表
CREATE TABLE clinical_trials (
    trial_id VARCHAR(50) PRIMARY KEY,
    nct_id VARCHAR(50),
    title VARCHAR(500),
    indication VARCHAR(200),
    phase VARCHAR(50),
    location JSON,
    hospitals JSON,
    sponsor VARCHAR(200),
    inclusion_criteria JSON,  -- 入组标准
    exclusion_criteria JSON,  -- 排除标准
    status ENUM('recruiting', 'closed', 'completed'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 匹配记录表
CREATE TABLE match_records (
    match_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50),
    record_id VARCHAR(50),
    trial_id VARCHAR(50),
    match_score DECIMAL(5,2),
    match_level ENUM('high', 'medium', 'low', 'none'),
    match_details JSON,
    eligibility_status ENUM('likely_eligible', 'possibly_eligible', 'ineligible', 'unknown'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 七、关键设计决策

### 7.1 为什么选择这些字段权重？

| 字段 | 权重 | 理由 |
|------|------|------|
| 癌种 | 25% | 最基本入组条件，错配完全无效 |
| 分期 | 20% | 决定试验阶段适用性 |
| 基因 | 15% | 靶向治疗的核心筛选条件 |
| 治疗线数 | 15% | 影响试验设计目标人群 |
| ECOG | 10% | 体能状态影响耐受性 |
| 地理位置 | 10% | 影响患者依从性和可行性 |

### 7.2 如何处理边缘情况？

1. **数据不完整**: 先基于已有数据匹配，标记缺失字段
2. **多种突变**: 优先匹配最高优先级突变
3. **跨癌种试验**: 使用癌种大类匹配，降低分数但不排除
4. **动态更新**: 患者数据更新后重新计算匹配分数

---

**现在可以基于这个设计开始前后端开发了！需要我提供具体的代码实现吗？** 🚀
