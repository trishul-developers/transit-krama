package com.trishul.transitkrama

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GameCoreTest {
    @Test
    fun everyCampaignLevelSolvesWithItsKnownOrder() {
        for (levelId in 1..LevelFactory.count()) {
            val definition = LevelFactory.create(levelId)
            val engine = TransitGameEngine(definition)

            definition.solutionOrder.forEach { vehicleId ->
                assertEquals(
                    "level " + levelId + " solution vehicle " + vehicleId + " must be clear",
                    null,
                    engine.rayBlocker(vehicleId)
                )
                val result = engine.dispatch(vehicleId)
                assertTrue(
                    "level " + levelId + " dispatch " + vehicleId + " must succeed",
                    result is DispatchResult.Success
                )
            }

            assertEquals("level " + levelId + " must end won", RoundState.WON, engine.roundState)
            assertTrue(engine.passengerQueue.isEmpty())
            assertTrue(engine.vehicles.all { it.state == VehicleState.CLEARED })
        }
    }

    @Test
    fun blockedVehicleReportsNearestBlocker() {
        val level = LevelFactory.create(1)
        val engine = TransitGameEngine(level)
        val blockedId = level.solutionOrder.last()
        val blocker = engine.rayBlocker(blockedId)
        assertNotNull(blocker)
        val result = engine.dispatch(blockedId)
        assertTrue(result is DispatchResult.Blocked)
    }

    @Test
    fun undoRestoresQueueBaysAndVehicleState() {
        val level = LevelFactory.create(1)
        val engine = TransitGameEngine(level)
        val firstId = level.solutionOrder.first()
        val initialQueue = engine.passengerQueue.toList()

        assertTrue(engine.dispatch(firstId) is DispatchResult.Success)
        assertTrue(engine.canUndo())
        assertTrue(engine.undo())

        assertEquals(initialQueue, engine.passengerQueue.toList())
        assertEquals(VehicleState.PARKED, engine.vehicle(firstId)?.state)
        assertEquals(0, engine.moves)
        assertFalse(engine.bays.any { it.vehicleId != null })
    }

    @Test
    fun campaignDifficultyTightensTransitBayBudget() {
        assertEquals(4, LevelFactory.create(1).bayCount)
        assertEquals(3, LevelFactory.create(8).bayCount)
        assertEquals(2, LevelFactory.create(20).bayCount)
        assertEquals(30, LevelFactory.count())
    }
}
