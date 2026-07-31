---
title: PostgreSQL 索引优化实战：从慢查询到毫秒级响应
date: 2026-06-30
category: 计算机学习
tags: PostgreSQL, 调优, 索引
excerpt: 一次线上慢查询排查的全过程，包含 EXPLAIN 分析、索引选择与教训总结。
published: true
---

某天线上监控报警，一个接口 P95 从 80ms 涨到了 2.3s。追查发现是一条订单查询在慢日志里反复出现。

## 定位问题

先把慢 SQL 拿出来，跑一遍 `EXPLAIN ANALYZE`：

```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 123 AND status = 'PAID'
ORDER BY created_at DESC
LIMIT 20;
```

执行计划显示走了全表扫描，16 万行数据扫了 1.8 秒。

## 选择索引

查询同时有等值条件（`user_id`、`status`）和排序（`created_at`），复合索引比单列索引更合适：

```sql
CREATE INDEX idx_orders_user_status_time
ON orders (user_id, status, created_at DESC);
```

重建后同样的查询降到 **12ms**，P95 回落到了 90ms 以内。

## 教训

- 索引不是越多越好，写入放大会拖慢业务
- 先用 `EXPLAIN` 验证，再动手建索引
- 线上索引变更选低峰期执行，并保留回滚方案

> 慢查询排查的正确顺序：先看执行计划，再谈优化，最后才是加索引。
