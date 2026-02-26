#!/usr/bin/env python3
"""
导入临床试验数据到Treatbot数据库
使用示例：python3 import_trials.py trials_data.xlsx
"""

import sys
import json
import urllib.request
import urllib.error

API_BASE = "http://49.235.162.129:3000"

def import_trials_data(excel_file):
    """读取Excel并导入到数据库"""
    
    print(f"📊 导入数据文件: {excel_file}")
    print("=" * 60)
    
    # 这里需要使用pandas读取Excel
    # 示例数据格式：
    trials_data = [
        {
            "trial_id": "NCT001",
            "title": "示例临床试验",
            "indication": "肺癌",
            "phase": "III期",
            "location": "北京",
            "status": "招募中"
        }
    ]
    
    # 导入API
    for trial in trials_data:
        try:
            data = json.dumps(trial).encode('utf-8')
            req = urllib.request.Request(
                f"{API_BASE}/api/trials",
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                print(f"✅ 导入成功: {trial['trial_id']}")
        except Exception as e:
            print(f"❌ 导入失败 {trial['trial_id']}: {e}")
    
    print("=" * 60)
    print("导入完成!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 import_trials.py <excel_file>")
        sys.exit(1)
    
    import_trials_data(sys.argv[1])
