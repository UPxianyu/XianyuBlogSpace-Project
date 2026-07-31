---
title: Go 并发模式笔记：Context、Goroutine 与错误传播
date: 2026-07-15
category: 计算机学习
tags: Go, 并发
excerpt: 写业务时最常见的几个 Go 并发场景，以及如何优雅地处理取消信号和错误聚合。
published: true
---

Go 的并发原语很简洁，但真正写出健壮的并发代码，靠的是几个固定模式。

## 用 Context 传递取消信号

任何会阻塞的调用，都应该接受 `context.Context`：

```go
func Fetch(ctx context.Context, url string) ([]byte, error) {
    req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

这样上层超时或者用户取消，下游调用会立即停止，而不是把资源白白耗在那里。

## errgroup：错误传播

并发执行多个任务，任何一个失败都应该让整个任务失败。标准库的 `errgroup` 正好做这件事：

```go
g, ctx := errgroup.WithContext(ctx)
for _, item := range items {
    item := item
    g.Go(func() error {
        return process(ctx, item)
    })
}
if err := g.Wait(); err != nil {
    return err
}
```

## 三个注意点

- **不要**在不知道 goroutine 何时退出时直接 `go func()`，用 WaitGroup 或 channel 收口
- 共享变量用互斥锁或直接改成 channel 通信
- `select` 里永远给 `ctx.Done()` 留一个分支

> 并发编程里 90% 的 bug，都来自"忘记取消"和"忘记等待"。
