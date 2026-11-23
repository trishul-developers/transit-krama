package com.trishul.transitkrama

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.SoundEffectConstants
import android.view.View
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

class TransitGameView(context: Context) : View(context) {
    private enum class Screen { HOME, LEVELS, PLAY }

    private data class MotionFx(
        val vehicleId: Int,
        val color: TransitColor,
        val startX: Float,
        val startY: Float,
        val endX: Float,
        val endY: Float,
        val startedAtNanos: Long
    )

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val path = Path()
    private val temp = RectF()
    private val prefs = context.getSharedPreferences("transit_krama_native", Context.MODE_PRIVATE)

    private var screen = Screen.HOME
    private var currentLevel = prefs.getInt("current_level_native", 1).coerceIn(1, LevelFactory.count())
    private var maxUnlocked = prefs.getInt("max_unlocked_native", 1).coerceIn(1, LevelFactory.count())
    private var engine = TransitGameEngine(LevelFactory.create(currentLevel))

    private var boardLeft = 0f
    private var boardTop = 0f
    private var boardSize = 0f
    private var cell = 0f
    private var baysTop = 0f

    private val continueRect = RectF()
    private val levelsRect = RectF()
    private val homeRect = RectF()
    private val restartRect = RectF()
    private val undoRect = RectF()
    private val hintRect = RectF()
    private val victoryRect = RectF()

    private var downY = 0f
    private var lastY = 0f
    private var dragging = false
    private var levelScroll = 0f
    private var hintVehicleId: Int? = null
    private var hintUntil = 0L
    private var blockedVehicleId: Int? = null
    private var blockedUntil = 0L
    private var toastText = ""
    private var toastUntil = 0L
    private var motionFx: MotionFx? = null
    private var paused = false

    private var homeBackground: Shader? = null
    private var playBackground: Shader? = null
    private var boardGlow: Shader? = null

    init {
        isFocusable = true
        isClickable = true
        setBackgroundColor(Color.rgb(4, 10, 18))
    }

    fun onHostResume() {
        paused = false
        invalidate()
    }

    fun onHostPause() {
        paused = true
    }

    fun handleBack(): Boolean {
        return when (screen) {
            Screen.PLAY, Screen.LEVELS -> {
                screen = Screen.HOME
                motionFx = null
                invalidate()
                true
            }
            Screen.HOME -> false
        }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        homeBackground = LinearGradient(
            0f, 0f, w.toFloat(), h.toFloat(),
            intArrayOf(Color.rgb(5, 13, 25), Color.rgb(8, 24, 37), Color.rgb(4, 10, 18)),
            floatArrayOf(0f, .52f, 1f), Shader.TileMode.CLAMP
        )
        playBackground = LinearGradient(
            0f, 0f, 0f, h.toFloat(),
            intArrayOf(Color.rgb(7, 17, 29), Color.rgb(10, 28, 39), Color.rgb(3, 9, 16)),
            null, Shader.TileMode.CLAMP
        )
        boardGlow = RadialGradient(
            w * .5f, h * .39f, w * .62f,
            intArrayOf(Color.argb(42, 34, 211, 238), Color.TRANSPARENT),
            null, Shader.TileMode.CLAMP
        )
        updateBoardMetrics(w, h)
    }

    private fun updateBoardMetrics(w: Int, h: Int) {
        val d = resources.displayMetrics.density
        val margin = 18f * d
        val availableHeight = h - 330f * d
        boardSize = min(w - margin * 2f, max(220f * d, availableHeight))
        boardLeft = (w - boardSize) * .5f
        boardTop = 132f * d
        cell = boardSize / engine.level.width.toFloat()
        baysTop = boardTop + boardSize + 15f * d
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        when (screen) {
            Screen.HOME -> drawHome(canvas)
            Screen.LEVELS -> drawLevels(canvas)
            Screen.PLAY -> drawPlay(canvas)
        }
        val now = System.nanoTime()
        if (!paused && (motionFx != null || now < hintUntil || now < blockedUntil || now < toastUntil)) {
            postInvalidateOnAnimation()
        }
    }

    private fun drawHome(canvas: Canvas) {
        paint.shader = homeBackground
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.shader = boardGlow
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.shader = null
        val d = resources.displayMetrics.density

        text(canvas, "TRANSIT KRAMA", 24f * d, 42f * d, 11f * d, Color.rgb(103, 232, 249), true, Paint.Align.LEFT)
        text(canvas, "CITY FLOW", 24f * d, 76f * d, 31f * d, Color.WHITE, true, Paint.Align.LEFT)
        text(canvas, "A native traffic logic puzzle", 24f * d, 99f * d, 11f * d, Color.rgb(148, 163, 184), false, Paint.Align.LEFT)

        temp.set(18f * d, 126f * d, width - 18f * d, min(height * .53f, 480f * d))
        paint.color = Color.rgb(11, 29, 43)
        canvas.drawRoundRect(temp, 25f * d, 25f * d, paint)
        stroke.color = Color.argb(68, 103, 232, 249)
        stroke.strokeWidth = d
        canvas.drawRoundRect(temp, 25f * d, 25f * d, stroke)
        drawHeroNetwork(canvas, temp)

        text(canvas, "Every vehicle has one way out.", temp.left + 20f * d, temp.top + 33f * d, 12f * d, Color.rgb(125, 211, 252), true, Paint.Align.LEFT)
        text(canvas, "Choose the order.", temp.left + 20f * d, temp.top + 68f * d, 25f * d, Color.WHITE, true, Paint.Align.LEFT)
        text(canvas, "Keep the bays open. Match the passenger flow.", temp.left + 20f * d, temp.top + 92f * d, 10f * d, Color.rgb(148, 163, 184), false, Paint.Align.LEFT)

        val buttonTop = temp.bottom + 18f * d
        continueRect.set(18f * d, buttonTop, width - 18f * d, buttonTop + 67f * d)
        drawButton(canvas, continueRect, Color.rgb(34, 211, 238))
        text(canvas, "CONTINUE", continueRect.left + 18f * d, continueRect.centerY() - 3f * d, 15f * d, Color.rgb(4, 19, 24), true, Paint.Align.LEFT)
        text(canvas, "Level " + currentLevel + " · " + LevelFactory.create(currentLevel).title, continueRect.left + 18f * d, continueRect.centerY() + 15f * d, 9f * d, Color.rgb(10, 59, 68), true, Paint.Align.LEFT)
        text(canvas, "›", continueRect.right - 23f * d, continueRect.centerY() + 5f * d, 29f * d, Color.rgb(4, 19, 24), true, Paint.Align.CENTER)

        levelsRect.set(18f * d, continueRect.bottom + 10f * d, width - 18f * d, continueRect.bottom + 58f * d)
        drawButton(canvas, levelsRect, Color.rgb(19, 38, 55))
        text(canvas, "LEVEL MAP", levelsRect.left + 18f * d, levelsRect.centerY() + 5f * d, 12f * d, Color.rgb(226, 232, 240), true, Paint.Align.LEFT)
        text(canvas, maxUnlocked.toString() + " / " + LevelFactory.count() + " unlocked", levelsRect.right - 18f * d, levelsRect.centerY() + 4f * d, 9f * d, Color.rgb(103, 232, 249), true, Paint.Align.RIGHT)

        text(canvas, "NATIVE ANDROID · OFFLINE · NO ADS", width * .5f, height - 26f * d, 8f * d, Color.rgb(71, 85, 105), true, Paint.Align.CENTER)
    }

    private fun drawHeroNetwork(canvas: Canvas, card: RectF) {
        val d = resources.displayMetrics.density
        val centerY = card.bottom - 74f * d
        stroke.strokeWidth = 9f * d
        stroke.strokeCap = Paint.Cap.ROUND
        stroke.color = Color.rgb(30, 64, 83)
        canvas.drawLine(card.left + 22f * d, centerY, card.right - 22f * d, centerY, stroke)
        stroke.strokeWidth = 2f * d
        stroke.color = Color.argb(170, 125, 211, 252)
        for (i in 0..9) {
            val x = card.left + 32f * d + i * ((card.width() - 64f * d) / 9f)
            canvas.drawCircle(x, centerY, 3f * d, stroke)
        }

        val colors = arrayOf(TransitColor.CYAN, TransitColor.AMBER, TransitColor.ROSE)
        for (i in 0..2) {
            val x = card.left + (70 + i * 86) * d
            val y = centerY - (if (i == 1) 43 else 0) * d
            drawVehicle(canvas, x, y, 34f * d, colors[i], if (i == 1) Direction.SOUTH else Direction.EAST, false, false)
        }
        paint.color = Color.rgb(16, 185, 129)
        canvas.drawCircle(card.right - 48f * d, centerY, 12f * d, paint)
        paint.color = Color.argb(55, 52, 211, 153)
        canvas.drawCircle(card.right - 48f * d, centerY, 24f * d, paint)
    }

    private fun drawLevels(canvas: Canvas) {
        paint.shader = homeBackground
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.shader = null
        val d = resources.displayMetrics.density

        text(canvas, "LEVEL MAP", 22f * d, 49f * d, 24f * d, Color.WHITE, true, Paint.Align.LEFT)
        text(canvas, "Solver-validated city routes", 22f * d, 70f * d, 10f * d, Color.rgb(100, 116, 139), false, Paint.Align.LEFT)
        homeRect.set(width - 62f * d, 20f * d, width - 18f * d, 64f * d)
        drawButton(canvas, homeRect, Color.rgb(19, 38, 55))
        text(canvas, "×", homeRect.centerX(), homeRect.centerY() + 7f * d, 22f * d, Color.WHITE, false, Paint.Align.CENTER)

        val columns = 4
        val gap = 10f * d
        val left = 18f * d
        val top = 96f * d - levelScroll
        val tileW = (width - left * 2f - gap * (columns - 1)) / columns
        val tileH = 72f * d

        for (i in 1..LevelFactory.count()) {
            val row = (i - 1) / columns
            val col = (i - 1) % columns
            val l = left + col * (tileW + gap)
            val t = top + row * (tileH + gap)
            if (t > height || t + tileH < 78f * d) continue
            temp.set(l, t, l + tileW, t + tileH)
            val unlocked = i <= maxUnlocked
            val active = i == currentLevel
            paint.color = when {
                active -> Color.rgb(8, 95, 112)
                unlocked -> Color.rgb(17, 35, 51)
                else -> Color.rgb(9, 20, 31)
            }
            canvas.drawRoundRect(temp, 16f * d, 16f * d, paint)
            stroke.strokeWidth = if (active) 2f * d else d
            stroke.color = when {
                active -> Color.rgb(103, 232, 249)
                unlocked -> Color.argb(55, 148, 163, 184)
                else -> Color.argb(25, 71, 85, 105)
            }
            canvas.drawRoundRect(temp, 16f * d, 16f * d, stroke)
            text(canvas, if (unlocked) i.toString().padStart(2, '0') else "—", temp.left + 12f * d, temp.top + 27f * d, 15f * d, if (unlocked) Color.WHITE else Color.rgb(71, 85, 105), true, Paint.Align.LEFT)
            if (unlocked) {
                text(canvas, LevelFactory.create(i).bayCount.toString() + " BAYS", temp.left + 12f * d, temp.bottom - 13f * d, 7f * d, Color.rgb(103, 232, 249), true, Paint.Align.LEFT)
            }
        }
    }

    private fun drawPlay(canvas: Canvas) {
        paint.shader = playBackground
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.shader = null
        val d = resources.displayMetrics.density

        homeRect.set(12f * d, 16f * d, 54f * d, 58f * d)
        restartRect.set(width - 54f * d, 16f * d, width - 12f * d, 58f * d)
        drawButton(canvas, homeRect, Color.rgb(17, 35, 51))
        drawButton(canvas, restartRect, Color.rgb(17, 35, 51))
        text(canvas, "‹", homeRect.centerX(), homeRect.centerY() + 7f * d, 24f * d, Color.WHITE, true, Paint.Align.CENTER)
        text(canvas, "↻", restartRect.centerX(), restartRect.centerY() + 5f * d, 18f * d, Color.rgb(203, 213, 225), true, Paint.Align.CENTER)
        text(canvas, "LEVEL " + engine.level.id.toString().padStart(2, '0'), width * .5f, 30f * d, 8f * d, Color.rgb(103, 232, 249), true, Paint.Align.CENTER)
        text(canvas, engine.level.title.uppercase(), width * .5f, 49f * d, 13f * d, Color.WHITE, true, Paint.Align.CENTER)

        drawQueue(canvas)
        drawBoard(canvas)
        drawBays(canvas)
        drawControls(canvas)

        when (engine.roundState) {
            RoundState.WON -> drawVictory(canvas)
            RoundState.DEADLOCKED -> drawDeadlock(canvas)
            RoundState.PLAYING -> Unit
        }

        if (System.nanoTime() < toastUntil) {
            temp.set(48f * d, boardTop + 10f * d, width - 48f * d, boardTop + 47f * d)
            paint.color = Color.argb(232, 6, 18, 30)
            canvas.drawRoundRect(temp, 14f * d, 14f * d, paint)
            text(canvas, toastText, temp.centerX(), temp.centerY() + 4f * d, 9f * d, Color.WHITE, true, Paint.Align.CENTER)
        }
    }

    private fun drawQueue(canvas: Canvas) {
        val d = resources.displayMetrics.density
        val top = 73f * d
        text(canvas, "PASSENGER FLOW", 16f * d, top + 10f * d, 7f * d, Color.rgb(100, 116, 139), true, Paint.Align.LEFT)
        text(canvas, engine.passengerQueue.size.toString() + " LEFT", width - 16f * d, top + 10f * d, 7f * d, Color.rgb(148, 163, 184), true, Paint.Align.RIGHT)

        val preview = engine.passengerQueue.take(12)
        val gap = 4f * d
        val dot = min(22f * d, (width - 32f * d - gap * 11f) / 12f)
        var x = 16f * d
        val y = top + 27f * d
        preview.forEach { color ->
            temp.set(x, y, x + dot, y + 17f * d)
            paint.color = colorInt(color)
            canvas.drawRoundRect(temp, 7f * d, 7f * d, paint)
            x += dot + gap
        }

        temp.set(16f * d, top + 50f * d, width - 16f * d, top + 54f * d)
        paint.color = Color.rgb(21, 42, 56)
        canvas.drawRoundRect(temp, 2f * d, 2f * d, paint)
        val progressWidth = temp.width() * engine.progress()
        temp.right = temp.left + progressWidth
        paint.color = Color.rgb(34, 211, 238)
        canvas.drawRoundRect(temp, 2f * d, 2f * d, paint)
    }

    private fun drawBoard(canvas: Canvas) {
        val d = resources.displayMetrics.density
        temp.set(boardLeft, boardTop, boardLeft + boardSize, boardTop + boardSize)
        paint.color = Color.rgb(15, 38, 47)
        canvas.drawRoundRect(temp, 25f * d, 25f * d, paint)
        paint.shader = boardGlow
        canvas.drawRoundRect(temp, 25f * d, 25f * d, paint)
        paint.shader = null

        stroke.strokeWidth = d
        stroke.color = Color.argb(38, 148, 163, 184)
        for (i in 1 until engine.level.width) {
            val p = boardLeft + i * cell
            canvas.drawLine(p, boardTop + 10f * d, p, boardTop + boardSize - 10f * d, stroke)
        }
        for (i in 1 until engine.level.height) {
            val p = boardTop + i * cell
            canvas.drawLine(boardLeft + 10f * d, p, boardLeft + boardSize - 10f * d, p, stroke)
        }

        val now = System.nanoTime()
        engine.vehicles.filter { it.state == VehicleState.PARKED }.forEach { vehicle ->
            val cx = boardLeft + (vehicle.x + .5f) * cell
            val cy = boardTop + (vehicle.y + .5f) * cell
            drawVehicle(
                canvas, cx, cy, cell * .64f, vehicle.color, vehicle.direction,
                vehicle.id == hintVehicleId && now < hintUntil,
                vehicle.id == blockedVehicleId && now < blockedUntil
            )
        }

        motionFx?.let { fx ->
            val elapsed = (now - fx.startedAtNanos) / 1_000_000_000f
            val t = (elapsed / .42f).coerceIn(0f, 1f)
            val eased = 1f - (1f - t) * (1f - t)
            val x = fx.startX + (fx.endX - fx.startX) * eased
            val y = fx.startY + (fx.endY - fx.startY) * eased - sin(t * Math.PI).toFloat() * 18f * d
            drawVehicle(canvas, x, y, cell * .60f, fx.color, Direction.NORTH, false, false)
            if (t >= 1f) motionFx = null
        }
    }

    private fun drawBays(canvas: Canvas) {
        val d = resources.displayMetrics.density
        val gap = 8f * d
        val bayWidth = (width - 32f * d - gap * (engine.bays.size - 1)) / engine.bays.size
        text(canvas, "TRANSIT BAYS", 16f * d, baysTop - 3f * d, 7f * d, Color.rgb(100, 116, 139), true, Paint.Align.LEFT)

        engine.bays.forEachIndexed { index, bay ->
            val left = 16f * d + index * (bayWidth + gap)
            temp.set(left, baysTop + 8f * d, left + bayWidth, baysTop + 82f * d)
            paint.color = Color.rgb(12, 27, 39)
            canvas.drawRoundRect(temp, 16f * d, 16f * d, paint)
            stroke.strokeWidth = d
            stroke.color = if (bay.vehicleId == null) Color.argb(45, 148, 163, 184) else Color.argb(120, 103, 232, 249)
            canvas.drawRoundRect(temp, 16f * d, 16f * d, stroke)
            text(canvas, "B" + (index + 1), temp.left + 9f * d, temp.top + 14f * d, 6f * d, Color.rgb(100, 116, 139), true, Paint.Align.LEFT)

            val bus = bay.vehicleId?.let(engine::vehicle)
            if (bus != null) {
                val fx = motionFx
                if (fx == null || fx.vehicleId != bus.id) {
                    drawVehicle(canvas, temp.centerX(), temp.centerY() + 6f * d, min(38f * d, bayWidth * .46f), bus.color, Direction.NORTH, false, false)
                }
                text(canvas, bus.boarded.toString() + "/" + bus.capacity, temp.right - 8f * d, temp.bottom - 9f * d, 7f * d, Color.rgb(203, 213, 225), true, Paint.Align.RIGHT)
            } else {
                text(canvas, "OPEN", temp.centerX(), temp.centerY() + 4f * d, 7f * d, Color.rgb(71, 85, 105), true, Paint.Align.CENTER)
            }
        }
    }

    private fun drawControls(canvas: Canvas) {
        val d = resources.displayMetrics.density
        val bottom = height - 15f * d
        val top = bottom - 54f * d
        val gap = 8f * d
        val w = (width - 32f * d - gap * 2f) / 3f
        undoRect.set(16f * d, top, 16f * d + w, bottom)
        hintRect.set(undoRect.right + gap, top, undoRect.right + gap + w, bottom)
        temp.set(hintRect.right + gap, top, width - 16f * d, bottom)
        val movesLeft = temp.left
        val movesRight = temp.right
        val movesCenter = temp.centerX()

        drawButton(canvas, undoRect, Color.rgb(17, 35, 51))
        drawButton(canvas, hintRect, Color.rgb(17, 35, 51))
        val movesRect = RectF(movesLeft, top, movesRight, bottom)
        drawButton(canvas, movesRect, Color.rgb(10, 26, 38))

        text(canvas, "UNDO", undoRect.centerX(), undoRect.centerY() + 4f * d, 9f * d, if (engine.canUndo()) Color.WHITE else Color.rgb(71, 85, 105), true, Paint.Align.CENTER)
        text(canvas, "HINT", hintRect.centerX(), hintRect.centerY() + 4f * d, 9f * d, Color.rgb(125, 211, 252), true, Paint.Align.CENTER)
        text(canvas, engine.moves.toString() + " MOVES", movesCenter, (top + bottom) * .5f + 4f * d, 9f * d, Color.rgb(148, 163, 184), true, Paint.Align.CENTER)
    }

    private fun drawVictory(canvas: Canvas) {
        val d = resources.displayMetrics.density
        paint.color = Color.argb(196, 2, 8, 23)
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        temp.set(28f * d, height * .30f, width - 28f * d, height * .68f)
        paint.color = Color.rgb(9, 29, 38)
        canvas.drawRoundRect(temp, 28f * d, 28f * d, paint)
        stroke.color = Color.rgb(52, 211, 153)
        stroke.strokeWidth = 2f * d
        canvas.drawRoundRect(temp, 28f * d, 28f * d, stroke)
        text(canvas, "ROUTE CLEARED", temp.centerX(), temp.top + 58f * d, 10f * d, Color.rgb(110, 231, 183), true, Paint.Align.CENTER)
        text(canvas, "Perfect flow.", temp.centerX(), temp.top + 102f * d, 28f * d, Color.WHITE, true, Paint.Align.CENTER)
        text(canvas, engine.moves.toString() + " dispatches", temp.centerX(), temp.top + 132f * d, 10f * d, Color.rgb(148, 163, 184), false, Paint.Align.CENTER)

        victoryRect.set(temp.left + 20f * d, temp.bottom - 78f * d, temp.right - 20f * d, temp.bottom - 20f * d)
        drawButton(canvas, victoryRect, Color.rgb(52, 211, 153))
        text(canvas, if (currentLevel < LevelFactory.count()) "NEXT ROUTE" else "LEVEL MAP", victoryRect.centerX(), victoryRect.centerY() + 5f * d, 12f * d, Color.rgb(3, 34, 27), true, Paint.Align.CENTER)
    }

    private fun drawDeadlock(canvas: Canvas) {
        val d = resources.displayMetrics.density
        temp.set(36f * d, boardTop + boardSize * .36f, width - 36f * d, boardTop + boardSize * .65f)
        paint.color = Color.argb(242, 52, 18, 28)
        canvas.drawRoundRect(temp, 20f * d, 20f * d, paint)
        stroke.color = Color.rgb(251, 113, 133)
        stroke.strokeWidth = d
        canvas.drawRoundRect(temp, 20f * d, 20f * d, stroke)
        text(canvas, "BAYS LOCKED", temp.centerX(), temp.top + 34f * d, 11f * d, Color.rgb(253, 164, 175), true, Paint.Align.CENTER)
        text(canvas, "Undo or restart the route.", temp.centerX(), temp.top + 60f * d, 9f * d, Color.WHITE, false, Paint.Align.CENTER)
    }

    private fun drawVehicle(
        canvas: Canvas, cx: Float, cy: Float, size: Float, color: TransitColor,
        direction: Direction, hinted: Boolean, blocked: Boolean
    ) {
        val d = resources.displayMetrics.density
        canvas.save()
        canvas.translate(cx, cy)
        canvas.rotate(
            when (direction) {
                Direction.NORTH -> 0f
                Direction.EAST -> 90f
                Direction.SOUTH -> 180f
                Direction.WEST -> 270f
            }
        )

        if (hinted || blocked) {
            paint.color = if (blocked) Color.argb(82, 251, 113, 133) else Color.argb(82, 103, 232, 249)
            canvas.drawCircle(0f, 0f, size * .73f, paint)
        }

        val w = size * .62f
        val h = size * .96f
        temp.set(-w * .5f + 3f * d, -h * .5f + 7f * d, w * .5f + 3f * d, h * .5f + 7f * d)
        paint.color = Color.argb(115, 0, 0, 0)
        canvas.drawRoundRect(temp, size * .18f, size * .18f, paint)

        temp.set(-w * .5f, -h * .5f, w * .5f, h * .5f)
        paint.color = colorInt(color)
        canvas.drawRoundRect(temp, size * .18f, size * .18f, paint)
        stroke.strokeWidth = max(1f, d)
        stroke.color = Color.argb(150, 255, 255, 255)
        canvas.drawRoundRect(temp, size * .18f, size * .18f, stroke)

        temp.set(-w * .34f, -h * .38f, w * .34f, -h * .18f)
        paint.color = Color.rgb(8, 29, 42)
        canvas.drawRoundRect(temp, size * .08f, size * .08f, paint)

        temp.set(-w * .34f, h * .02f, w * .34f, h * .28f)
        paint.color = Color.argb(44, 255, 255, 255)
        canvas.drawRoundRect(temp, size * .09f, size * .09f, paint)

        path.reset()
        path.moveTo(0f, -h * .31f)
        path.lineTo(w * .18f, -h * .08f)
        path.lineTo(w * .07f, -h * .08f)
        path.lineTo(w * .07f, h * .17f)
        path.lineTo(-w * .07f, h * .17f)
        path.lineTo(-w * .07f, -h * .08f)
        path.lineTo(-w * .18f, -h * .08f)
        path.close()
        paint.color = Color.WHITE
        canvas.drawPath(path, paint)
        canvas.restore()
    }

    private fun drawButton(canvas: Canvas, rect: RectF, color: Int) {
        val d = resources.displayMetrics.density
        temp.set(rect)
        temp.offset(0f, 3f * d)
        paint.color = Color.argb(120, 0, 0, 0)
        canvas.drawRoundRect(temp, 16f * d, 16f * d, paint)
        paint.color = color
        canvas.drawRoundRect(rect, 16f * d, 16f * d, paint)
    }

    private fun text(canvas: Canvas, value: String, x: Float, y: Float, size: Float, color: Int, bold: Boolean, align: Paint.Align) {
        paint.shader = null
        paint.style = Paint.Style.FILL
        paint.color = color
        paint.textSize = size
        paint.textAlign = align
        paint.typeface = Typeface.create("sans-serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
        canvas.drawText(value, x, y, paint)
    }

    private fun colorInt(color: TransitColor): Int = when (color) {
        TransitColor.CYAN -> Color.rgb(34, 211, 238)
        TransitColor.AMBER -> Color.rgb(251, 191, 36)
        TransitColor.ROSE -> Color.rgb(251, 113, 133)
        TransitColor.LIME -> Color.rgb(132, 204, 22)
        TransitColor.VIOLET -> Color.rgb(167, 139, 250)
        TransitColor.ORANGE -> Color.rgb(251, 146, 60)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downY = event.y
                lastY = event.y
                dragging = false
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                if (screen == Screen.LEVELS) {
                    val dy = event.y - lastY
                    if (abs(event.y - downY) > 8f * resources.displayMetrics.density) dragging = true
                    val rows = (LevelFactory.count() + 3) / 4
                    val content = rows * 82f * resources.displayMetrics.density
                    val maxScroll = max(0f, content - (height - 110f * resources.displayMetrics.density))
                    levelScroll = (levelScroll - dy).coerceIn(0f, maxScroll)
                    lastY = event.y
                    invalidate()
                }
                return true
            }
            MotionEvent.ACTION_UP -> {
                if (!dragging) handleTap(event.x, event.y)
                performClick()
                return true
            }
            MotionEvent.ACTION_CANCEL -> return true
        }
        return super.onTouchEvent(event)
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    private fun handleTap(x: Float, y: Float) {
        when (screen) {
            Screen.HOME -> when {
                continueRect.contains(x, y) -> startLevel(currentLevel)
                levelsRect.contains(x, y) -> {
                    screen = Screen.LEVELS
                    invalidate()
                }
            }
            Screen.LEVELS -> handleLevelMapTap(x, y)
            Screen.PLAY -> handlePlayTap(x, y)
        }
    }

    private fun handleLevelMapTap(x: Float, y: Float) {
        if (homeRect.contains(x, y)) {
            screen = Screen.HOME
            invalidate()
            return
        }
        val d = resources.displayMetrics.density
        val columns = 4
        val gap = 10f * d
        val left = 18f * d
        val top = 96f * d - levelScroll
        val tileW = (width - left * 2f - gap * (columns - 1)) / columns
        val tileH = 72f * d
        for (i in 1..maxUnlocked) {
            val row = (i - 1) / columns
            val col = (i - 1) % columns
            val l = left + col * (tileW + gap)
            val t = top + row * (tileH + gap)
            if (x in l..(l + tileW) && y in t..(t + tileH)) {
                startLevel(i)
                return
            }
        }
    }

    private fun handlePlayTap(x: Float, y: Float) {
        if (engine.roundState == RoundState.WON && victoryRect.contains(x, y)) {
            if (currentLevel < LevelFactory.count()) startLevel(currentLevel + 1)
            else {
                screen = Screen.LEVELS
                invalidate()
            }
            return
        }
        if (homeRect.contains(x, y)) {
            screen = Screen.HOME
            motionFx = null
            invalidate()
            return
        }
        if (restartRect.contains(x, y)) {
            engine.reset()
            motionFx = null
            hintVehicleId = null
            softTap()
            invalidate()
            return
        }
        if (undoRect.contains(x, y) && engine.canUndo()) {
            engine.undo()
            motionFx = null
            softTap()
            invalidate()
            return
        }
        if (hintRect.contains(x, y)) {
            hintVehicleId = engine.hintVehicleId()
            hintUntil = System.nanoTime() + 1_500_000_000L
            softTap()
            invalidate()
            return
        }

        if (x !in boardLeft..(boardLeft + boardSize) || y !in boardTop..(boardTop + boardSize)) return
        val gx = ((x - boardLeft) / cell).toInt().coerceIn(0, engine.level.width - 1)
        val gy = ((y - boardTop) / cell).toInt().coerceIn(0, engine.level.height - 1)
        val vehicle = engine.vehicles.firstOrNull { it.state == VehicleState.PARKED && it.x == gx && it.y == gy } ?: return

        val startX = boardLeft + (vehicle.x + .5f) * cell
        val startY = boardTop + (vehicle.y + .5f) * cell
        when (val result = engine.dispatch(vehicle.id)) {
            is DispatchResult.Blocked -> {
                blockedVehicleId = result.vehicleId
                blockedUntil = System.nanoTime() + 520_000_000L
                toast("Path blocked")
                rejectTap()
            }
            is DispatchResult.NoBay -> {
                toast("No open transit bay")
                rejectTap()
            }
            is DispatchResult.Success -> {
                val end = bayCenter(result.bayIndex)
                motionFx = MotionFx(vehicle.id, vehicle.color, startX, startY, end.first, end.second, System.nanoTime())
                toast(
                    if (result.boardedPassengers > 0) result.boardedPassengers.toString() + " boarded"
                    else "Bus waiting for matching passengers"
                )
                softTap()

                if (result.roundState == RoundState.WON) {
                    val next = min(LevelFactory.count(), currentLevel + 1)
                    maxUnlocked = max(maxUnlocked, next)
                    prefs.edit()
                        .putInt("current_level_native", next)
                        .putInt("max_unlocked_native", maxUnlocked)
                        .apply()
                    victoryHaptic()
                } else if (result.roundState == RoundState.DEADLOCKED) {
                    rejectTap()
                }
            }
            DispatchResult.Ignored -> Unit
        }
        invalidate()
    }

    private fun bayCenter(index: Int): Pair<Float, Float> {
        val d = resources.displayMetrics.density
        val gap = 8f * d
        val bayWidth = (width - 32f * d - gap * (engine.bays.size - 1)) / engine.bays.size
        val left = 16f * d + index * (bayWidth + gap)
        return Pair(left + bayWidth * .5f, baysTop + 45f * d)
    }

    private fun startLevel(levelId: Int) {
        currentLevel = levelId.coerceIn(1, LevelFactory.count())
        engine.reset(LevelFactory.create(currentLevel))
        updateBoardMetrics(width, height)
        prefs.edit().putInt("current_level_native", currentLevel).apply()
        screen = Screen.PLAY
        levelScroll = 0f
        hintVehicleId = null
        blockedVehicleId = null
        motionFx = null
        invalidate()
    }

    private fun toast(message: String) {
        toastText = message
        toastUntil = System.nanoTime() + 1_000_000_000L
    }

    private fun softTap() {
        playSoundEffect(SoundEffectConstants.CLICK)
        performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    }

    private fun rejectTap() {
        performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    private fun victoryHaptic() {
        try {
            val effect = VibrationEffect.createWaveform(longArrayOf(0, 25, 40, 35, 45, 70), -1)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                manager?.defaultVibrator?.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                (context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.vibrate(effect)
            }
        } catch (_: Throwable) {
            performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }
    }
}
