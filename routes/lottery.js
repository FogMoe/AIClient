const express = require('express');
const router = express.Router();
const { canDrawLottery, recordLotteryDraw, updateUserCoins, getUserById } = require('../config/database');
const { logger } = require('../utils/logger');

// 获取抽奖状态
router.get('/status', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const status = await canDrawLottery(userId);
        res.json(status);
    } catch (err) {
        logger.error('获取抽奖状态出错:', err);
        res.status(500).json({ canDraw: false, remaining: 0 });
    }
});

// 执行抽奖
router.post('/draw', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const status = await canDrawLottery(userId);
        if (!status.canDraw) {
            return res.status(429).json({ success: false, message: '今天已抽奖，请24小时后再试', remaining: status.remaining });
        }

        // 根据概率生成金币
        const rand = Math.random();
        let coins = 0;
        if (rand < 0.1) {
            coins = Math.floor(Math.random() * 10); // 0-9
        } else if (rand < 0.2) {
            coins = 20 + Math.floor(Math.random() * 10); // 20-29
        } else {
            coins = 10 + Math.floor(Math.random() * 10); // 10-19
        }

        // 记录抽奖并加金币
        await recordLotteryDraw(userId);
        await updateUserCoins(userId, coins);
        const user = await getUserById(userId);

        res.json({ success: true, coins, updatedCoins: user.coins });
    } catch (err) {
        logger.error('抽奖错误:', err);
        res.status(500).json({ success: false, message: '抽奖失败' });
    }
});

module.exports = router; 