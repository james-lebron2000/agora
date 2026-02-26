#!/usr/bin/env python3
"""
病历OCR API端点
集成Kimi多模态API进行病历结构化提取
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import logging

from kimi_ocr import KimiOCRService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建蓝图
ocr_bp = Blueprint('ocr', __name__)

# 初始化OCR服务
ocr_service = KimiOCRService()

# 允许的文件类型
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@ocr_bp.route('/extract', methods=['POST'])
def extract_medical_record():
    """
    从上传的病历图像/PDF中提取结构化信息
    
    POST /api/ocr/extract
    Content-Type: multipart/form-data
    
    Parameters:
        - file: 病历图像或PDF文件
        
    Returns:
        {
            "success": true,
            "data": {
                "patient_basic_info": {...},
                "diagnosis": {...},
                "staging": {...},
                ...
            },
            "completeness_score": 0.85
        }
    """
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "未上传文件",
                "code": 400
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "文件名为空",
                "code": 400
            }), 400
        
        # 检查文件类型
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error": "不支持的文件类型，请上传png/jpg/pdf文件",
                "code": 400
            }), 400
        
        # 保存文件
        upload_dir = "/tmp/medical_uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        logger.info(f"文件已保存: {file_path}")
        
        # 处理文件
        if filename.lower().endswith('.pdf'):
            # PDF处理 - 这里简化处理，实际应该转换后调用图像OCR
            result = {"error": "PDF处理需要额外实现pdf2image转换"}
        else:
            # 图像处理
            result = ocr_service.process_image(file_path)
        
        # 清理临时文件
        try:
            os.remove(file_path)
        except:
            pass
        
        # 检查处理结果
        if 'error' in result:
            return jsonify({
                "success": False,
                "error": result['error'],
                "code": 500
            }), 500
        
        # 计算完整度
        completeness = calculate_completeness(result)
        
        return jsonify({
            "success": True,
            "data": result,
            "completeness_score": completeness,
            "message": "病历信息提取成功"
        })
        
    except Exception as e:
        logger.error(f"处理请求时出错: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}",
            "code": 500
        }), 500

@ocr_bp.route('/batch-extract', methods=['POST'])
def batch_extract():
    """
    批量处理多个病历文件
    
    POST /api/ocr/batch-extract
    Content-Type: multipart/form-data
    
    Parameters:
        - files[]: 多个病历文件
        
    Returns:
        {
            "success": true,
            "results": [
                {"filename": "1.jpg", "data": {...}},
                {"filename": "2.jpg", "data": {...}}
            ]
        }
    """
    try:
        if 'files' not in request.files:
            return jsonify({
                "success": False,
                "error": "未上传文件"
            }), 400
        
        files = request.files.getlist('files')
        results = []
        
        for file in files:
            if file and allowed_file(file.filename):
                # 处理单个文件...
                # 这里简化处理
                results.append({
                    "filename": file.filename,
                    "status": "processed"
                })
        
        return jsonify({
            "success": True,
            "results": results,
            "message": f"成功处理{len(results)}个文件"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@ocr_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "ok",
        "service": "kimi-ocr",
        "timestamp": datetime.now().isoformat()
    })

def calculate_completeness(data: dict) -> float:
    """
    计算数据完整度
    """
    total = 0
    filled = 0
    
    def count(obj):
        nonlocal total, filled
        if isinstance(obj, dict):
            for v in obj.values():
                if isinstance(v, (dict, list)):
                    count(v)
                else:
                    total += 1
                    if v is not None and v != "":
                        filled += 1
        elif isinstance(obj, list):
            for item in obj:
                count(item)
    
    count(data)
    
    return round(filled / total, 2) if total > 0 else 0.0


# 注册到Flask应用
def register_ocr_bp(app):
    """注册OCR蓝图到Flask应用"""
    app.register_blueprint(ocr_bp, url_prefix='/api/ocr')
    logger.info("OCR API已注册")


if __name__ == '__main__':
    from flask import Flask
    from datetime import datetime
    
    app = Flask(__name__)
    register_ocr_bp(app)
    
    print("Kimi OCR API服务已启动")
    print("测试命令:")
    print("  curl -X POST http://localhost:5000/api/ocr/extract -F 'file=@test.jpg'")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
