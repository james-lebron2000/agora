#!/usr/bin/env python3
"""
Kimi多模态OCR服务 - 病历图像/PDF结构化提取
"""

import os
import json
import base64
import tempfile
import logging
from typing import Dict, List, Optional
from datetime import datetime

import requests

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Kimi API配置
KIMI_API_KEY = "sk-jNGnc1N6uxUGIyY4YI7Z143DZ4BPTtkWA8nuPRj7lDBG98sg"
KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions"

class KimiOCRService:
    """
    Kimi多模态OCR服务 - 从病历图像/PDF中提取结构化医学信息
    """
    
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {KIMI_API_KEY}",
            "Content-Type": "application/json"
        }
    
    def process_image(self, image_path: str) -> Dict:
        """处理单张病历图像"""
        try:
            logger.info(f"处理图像: {image_path}")
            
            # 读取并编码图像
            with open(image_path, "rb") as f:
                image_base64 = base64.b64encode(f.read()).decode('utf-8')
            
            # 系统提示词 - 定义输出格式
            system_prompt = """你是一位专业的医学信息提取专家。请从病历图像中提取结构化信息，按以下JSON格式输出：

{
  "patient_basic_info": {
    "name": "患者姓名",
    "gender": "性别",
    "age": "年龄",
    "height": "身高",
    "weight": "体重"
  },
  "diagnosis": {
    "primary_diagnosis": "主要诊断",
    "icd10_code": "ICD-10编码",
    "morphology": "病理类型"
  },
  "staging": {
    "overall_stage": "分期",
    "tnm": "TNM分期"
  },
  "molecular_pathology": {
    "egfr": {"tested": true, "mutation_status": "阳性/阴性", "mutation_type": "突变类型"},
    "alk": {"tested": true, "rearrangement_status": "阳性/阴性"},
    "pdl1": {"tested": true, "tps_score": "评分数字"}
  },
  "treatment_history": {
    "total_lines": "治疗线数",
    "treatments": [{"line_number": 1, "regimen": "方案", "response": "疗效"}]
  },
  "physical_status": {
    "ecog_score": "ECOG评分"
  },
  "laboratory": {
    "complete_blood_count": {"wbc": "白细胞", "hemoglobin": "血红蛋白"},
    "liver_function": {"alt": "ALT", "ast": "AST"},
    "tumor_markers": {"cea": "CEA"}
  }
}

规则：
1. 日期格式：YYYY-MM-DD
2. 数值型字段只保留数字
3. 不存在的信息填null
4. 布尔值用true/false"""
            
            # 构建请求
            payload = {
                "model": "kimi-latest",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                            {"type": "text", "text": "请提取这份病历的所有结构化医学信息"}
                        ]
                    }
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
            }
            
            # 调用API
            response = requests.post(KIMI_API_URL, headers=self.headers, json=payload, timeout=120)
            
            if response.status_code != 200:
                return {"error": f"API调用失败: {response.status_code}"}
            
            result = response.json()
            extracted = json.loads(result['choices'][0]['message']['content'])
            
            logger.info(f"图像处理完成")
            return extracted
            
        except Exception as e:
            logger.error(f"处理出错: {str(e)}")
            return {"error": str(e)}


# 测试代码
if __name__ == '__main__':
    service = KimiOCRService()
    print("Kimi OCR服务已初始化")
    print(f"API Key: {KIMI_API_KEY[:10]}...")
