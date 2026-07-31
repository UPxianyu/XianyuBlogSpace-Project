---
title: 用 Docker 搭建本地开发环境的完整指南
date: 2026-05-20
category: 计算机学习
tags: Docker, 开发环境
excerpt: 数据库、Redis、消息队列一键拉起，同事拉下仓库就能跑，告别环境不一致。
published: true
---

团队里最经典的对话："我这边明明是好的！"——直到我们统一用 Docker Compose 管理本地环境。

## 一个完整的 compose 文件

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

`docker compose up -d` 一下，数据库和缓存就绪。

## 日常使用技巧

1. 数据目录用命名卷，升级镜像不丢数据
2. `.env` 管理端口与密码，不进 Git
3. 开发容器里用 `watch` 命令挂载热更新，改代码不用重启

> 环境一致性的本质：把"怎么跑起来"这件事从文档里挪进代码里。

## 注意

Windows 上注意文件挂载的性能，必要时把项目源码放进 WSL2 再挂载，编译速度差很多。
