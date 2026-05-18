# 参考项目

本仓库的 `external/` 目录用于放置其他 JX3 DPS / 计算器参考项目。该目录只作为本地研发参考，已通过 `.gitignore` 排除，不会提交到本仓库。

## 拉取方式

在仓库根目录执行：

```powershell
New-Item -ItemType Directory -Force external

git clone https://github.com/jx3dps-online/jx3dps-online-public.git external/jx3dps-online-public
git clone https://github.com/j3pz/Acacia.git external/Acacia
git clone https://github.com/colahere/jx3dps-online.git external/jx3dps-online
git clone https://github.com/ItsAlbertZhang/JX3CalcBE.git external/JX3CalcBE
git clone https://github.com/jx3calc/jx3calc.git external/jx3calc
git clone https://github.com/ItsAlbertZhang/JX3CalcFE.git external/JX3CalcFE
```

## 项目清单

| 项目 | 本地目录 | 链接 | 主要用途 |
| --- | --- | --- | --- |
| jx3dps-online-public | `external/jx3dps-online-public` | https://github.com/jx3dps-online/jx3dps-online-public | 主要公式、数据结构、目标数据、团队增益和技能模型参考 |
| Acacia | `external/Acacia` | https://github.com/j3pz/Acacia | 早期模拟器结构参考，适合观察 Controller / Buff / Skill 分层 |
| jx3dps-online | `external/jx3dps-online` | https://github.com/colahere/jx3dps-online | 旧版数据和历史实现参考，不建议直接使用其旧等级常量 |
| JX3CalcBE | `external/JX3CalcBE` | https://github.com/ItsAlbertZhang/JX3CalcBE | 后端 API、任务式计算和输入输出结构参考 |
| jx3calc | `external/jx3calc` | https://github.com/jx3calc/jx3calc | 更完整的底层数据解析、技能和 Buff 框架参考 |
| JX3CalcFE | `external/JX3CalcFE` | https://github.com/ItsAlbertZhang/JX3CalcFE | WebUI、结果展示、伤害分析、方案输入体验参考 |

## 使用建议

- 优先参考 `jx3dps-online-public` 的公式分层、技能数据模型和团队增益数据。
- 优先参考 `JX3CalcFE` 的 WebUI 信息架构和结果展示方式。
- 不要直接把参考项目源码复制进本仓库；需要吸收的内容应转化为本项目自己的类型、数据和测试。
- 如果参考项目更新，直接在对应 `external/` 子目录内执行 `git pull`。
