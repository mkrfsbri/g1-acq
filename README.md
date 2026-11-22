# g1-acq

[![Telegram](https://img.shields.io/badge/Telegram-AI羊毛交流群-26A5E4?logo=telegram&logoColor=white)](https://t.me/muihbb)

> 💬 **AI羊毛交流群**:https://t.me/muihbb —— 交流 AI 优惠、订阅羊毛

Google One(iOS)订阅入口的商品 ID 映射模块,适用于 **Shadowrocket / 小火箭**。

在 `one.google.com/ai` 订阅页的响应里,把 20TB、30TB 两个月付档的原始 iOS 内购 ID 替换为实际存在的优惠档 ID,让订阅面板直接以优惠档拉起 App Store 收银台。

> 仅改写响应文本中的商品 ID 字符串。改写后实际能否下单、价格与权益,以 App Store 收银台面板和 Google One 账户的实际状态为准。

---

## 模块地址(手机端只填这一条)

```
https://cdn.jsdelivr.net/gh/crhywun/g1-acq@main/g1-acq.sgmodule
```

脚本地址(模块内已引用,无需单独添加):

```
https://cdn.jsdelivr.net/gh/crhywun/g1-acq@main/g1-acq.js
```

## 映射表

| 原始 iOS 内购 ID | 替换为 | 说明 |
|---|---|---|
| `g1.ios.20tb.m.v2` | `g1.20tb.3months_ip_90p.acq` | 20TB 月付 → 优惠档 |
| `g1.ios.30tb.ai.pro.m` | `g1.ai.ultra.3months_ip_90p.acq` | 30TB AI Pro 月付 → AI Ultra 优惠档 |

两个优惠档名称必须真实出现在响应的商品目录里,脚本才会执行替换;主档不在目录而备用档(75p)在目录时,自动降级使用备用档:

| 主档(90p) | 备用档(75p) |
|---|---|
| `g1.20tb.3months_ip_90p.acq` | `g1.20tb.3months_ip_75p.acq` |
| `g1.ai.ultra.3months_ip_90p.acq` | `g1.ai.ultra.3months_ip_75p.acq` |

优惠档 ID 属于限时促销商品,名称与档位随 Google 活动变化;目录探测日志会列出当前响应里真实存在的所有优惠档,以日志为准增删 `SKU_MAP`。

## 安装(Shadowrocket / 小火箭)

进入「HTTPS 解密」设置的入口:配置页 → 点当前使用配置右侧的 **(i) 图标**,在弹出的配置编辑页里找到 **HTTPS 解密**。

![配置页入口:点击 shadowrocket.conf 右侧的 (i) 图标进入配置编辑,才能看到 HTTPS 解密](docs-config-entry.png)

1. 首页保持 VPN 开启
2. 设置 → **HTTPS 解密**(即 MITM)→ 总开关打开 → 证书:生成并安装 → iOS 系统里完成两步:
   - 设置 → 通用 → VPN 与设备管理 → 安装 Shadowrocket 描述文件
   - 设置 → 通用 → 关于本机 → **证书信任设置** → 打开 Shadowrocket 根证书的信任开关(漏这步解密无效)
3. HTTPS 解密页的 hostname 列表确认有 `one.google.com`(模块开启时自动追加;若日志始终无 `[g1-acq]` 且连接显示未解密,再手动把 `one.google.com` 填进 hostname 列表末尾)
4. 配置 → 模块 → 右上角 `+` → 填入上面的模块地址 → 安装
5. 确认模块开关点亮,长按重连一次

## 工作范围

- URL 匹配:`^https://one\.google\.com/ai\?`(仅订阅入口页,不拦全站)
- MITM(设置 → HTTPS 解密)hostname:`one.google.com`
- QUIC 屏蔽:模块自带规则拦截 UDP 443,避免 Google App 走 HTTP/3 绕过 HTTPS 解密

## 使用流程(手机端)

1. 打开 **Google App**(彩色 G 图标那个) → 头像 → **Google One 管理**,进入订阅管理页(模块改写的就是这个页面发出的 `/ai` 响应)
2. 在 Ultra 方案选择面板里,直接点 **20TB 档的「订阅此方案」**,App Store 收银台即以优惠价(约一折)拉起;30TB 档同理

![Google One Ultra 方案选择面板:点击 20TB 档的「订阅此方案」按钮](docs-ultra-plans.png)

> 注意:从 Google One 独立 App 进入的订阅页走的是原生接口,不在本模块的改写范围内;请从 **Google App 内的 Google One 管理** 进入。

## 验证与排错

进 数据 → 日志 → 代理,搜索 `g1-acq`:

| 日志 | 含义 |
|---|---|
| `[g1-acq] v6 loaded` | 脚本已加载,版本正确 |
| `目录优惠档: ...` | 响应里真实存在的全部优惠档 |
| `主档不在目录,降级 ...` | 已自动使用备用档 |
| `共改写 N 处` | 替换已执行 |
| 完全没有 `g1-acq` | 脚本未触发,检查 VPN / HTTPS 解密(证书安装 + 信任开关) / 模块开关 |

改完 `SKU_MAP` 后:本地 `git push`,然后手机端清一次小火箭缓存(数据 → 清空所有数据)再重连即可拉到新脚本;jsDelivr 有约几分钟缓存,可手动 purge:`https://purge.jsdelivr.net/gh/crhywun/g1-acq@main/g1-acq.js`。

## 权限与安全边界

- **流量可见范围**:脚本仅匹配 `one.google.com/ai` 的 HTTP 响应,可读取并改写该页面的响应体;其余任何域名的流量一概不读取、不修改
- **无外发能力**:脚本不包含 `$httpClient` 等网络调用,所有输出只写入手机本地日志
- **MITM 范围**:仅追加 `one.google.com` 一个 hostname;CA 证书由用户在本机生成并保管,模块作者无法获取
- **系统权限**:不索取任何 iOS 权限(无通知/定位/相册等弹窗);安装动作只发生在小火箭内部
- **全局副作用**:`[Rule]` 屏蔽全部 UDP 443(QUIC),影响所有 App 的 HTTP/3 访问速度,属性能副作用,无隐私影响
- **信任模型**:脚本地址指向 GitHub 仓库 + jsDelivr CDN。安装即表示信任仓库所有者对脚本的后续修改(理论上恶意版本最多可获取 `one.google.com/ai` 这一个域的 Cookie 与页面数据,其他站点一律碰不到),以及 GitHub / jsDelivr 的服务完整性。脚本开源,任何人可审查;分发时可把 `@main` 换成具体 commit hash 锁定不可变版本

## 文件

| 文件 | 用途 |
|---|---|
| `g1-acq.sgmodule` | Shadowrocket 模块(规则 + 脚本引用 + MITM) |
| `g1-acq.js` | 响应改写脚本(v6,Shadowrocket) |
| `g1-acq-anywhere.js` | 响应改写脚本(Anywhere 版,API 为 `process(ctx)` + `Anywhere.codec`) |
| `g1-acq.amod` | Anywhere 模块(内嵌 above 脚本,导入即用) |

## Anywhere(免费开源)使用

1. 安装 [Anywhere](https://apps.apple.com/id/app/anywhere-proxy/id6758235178)(iOS 18+,免费)
2. 应用内生成并安装根证书:iOS 设置 → 通用 → 关于本机 → 证书信任设置 → 开启信任
3. 开启应用内 MITM 总开关
4. Modules → 导入 `.amod` 文件,或订阅:
   ```
   https://raw.githubusercontent.com/mkrfsbri/g1-acq/main/g1-acq.amod
   ```
5. 开启模块开关,连接 VPN
6. Google App → Google One 管理员 → 订阅页 → 20TB/30TB 档订阅
7. 验证:日志搜 `[g1-acq]`,出现 `rewrote N occurrence(s)` 即生效

## 自定义

- 增删档位:只改 `g1-acq.js` 顶部 `SKU_MAP` 与 `FALLBACK` 两个表
- 改价格:当前未实现价格字段改写;如需,在替换循环后追加对 `price_amount_micros` 的正则替换
- 脚本无任何网络上报与外部依赖
