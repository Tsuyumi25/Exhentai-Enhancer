我會將程式的邏輯轉換成 LaTeX 數學表達式。這樣可以更清晰地看到整個計算過程。

# 放大鏡數學模型

## 1. 基礎參數定義
- 圖片當前狀態：$I(w_c, h_c, x_c, y_c)$ 
- 視窗尺寸：$V(w_v, h_v)$
- 滑鼠位置：$M(x_m, y_m)$
- 放大倍率：$s_{mag}$
- CSS 縮放比例：$s_{css} = \frac{image\_size}{100}$

## 2. 標準化圖片尺寸
基於視窗高度的標準化：
$\begin{cases}
h_{norm} = h_v \\
w_{norm} = h_v \cdot \frac{w_c}{h_c} \\
x_{norm} = \frac{w_v - w_{norm}}{2} \\
y_{norm} = 0
\end{cases}$

## 3. 放大鏡中心點
$\begin{cases}
x_{center} = x_c + \frac{w_c}{2} \\
y_{center} = \frac{h_v}{2}
\end{cases}$

## 4. 互動區域計算
邊緣留白參數：$(m_h, m_v)$

互動範圍：
$\begin{cases}
x_{start} = x_c + w_c \cdot m_h \\
x_{end} = x_c + w_c \cdot (1-m_h) \\
y_{start} = \max(y_c + h_c \cdot m_v, y_{norm}) \\
y_{end} = \min(y_c + h_c \cdot (1-m_v), y_{norm} + h_{norm})
\end{cases}$

## 5. 相對位置映射
$\begin{cases}
x_{rel} = \frac{x_m - x_{start}}{x_{end} - x_{start}} \\
y_{rel} = \frac{y_m - y_{start}}{y_{end} - y_{start}}
\end{cases}$

## 6. 最終變換
合成縮放比例：$s_{final} = s_{css} \cdot s_{mag}$

位移計算：
$\begin{cases}
\Delta x = x_{center} - (w_{norm} \cdot x_{rel}) \cdot s_{final} + (x_m - x_{center}) \\
\Delta y = y_{center} - (h_{norm} \cdot y_{rel}) \cdot s_{final} + (y_m - y_{center})
\end{cases}$

## 7. CSS 輸出轉換
```css
{
  width: w_{norm} * s_{final}
  height: h_{norm} * s_{final}
  transform: translate(Δx, Δy)
}
```

## 8. 載入進度遮罩（當 isLoadingOriginal 為真）
$mask(p) = \begin{cases}
black & \text{for } y \leq p\% \\
transparent & \text{for } y > p\%
\end{cases}$

其中 $p$ 為載入進度百分比

---

這個數學表達提供了：
1. 清晰的變量定義
2. 明確的計算步驟
3. 精確的轉換關係

需要注意的是：
- 所有座標都基於視窗左上角為原點
- 比例計算都保持原始圖片的寬高比
- 邊界情況需要額外處理

你覺得這樣的表達方式是否有助於理解整個系統？如果需要，我們可以為特定部分加入更多細節或例子。