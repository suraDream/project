const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middlewares/auth');


router.post('/add-following', async (req, res) => {
  const {fieldId, userId} = req.body;
  

  try {
    const result = await pool.query('INSERT INTO following (user_id, field_id) VALUES ($1, $2) RETURNING *', [userId, fieldId]);
    const dataField = await pool.query('SELECT user_id FROM field WHERE field_id = $1', [fieldId]);
    const fieldOwnerId = dataField.rows[0]?.user_id;
    res.status(200).json({message: 'Following added successfully', following: 1, data: result.rows[0]});
    // if(req){
    //     req.io.emit('new_notification', {topic: 'new_following', reciveId: Number(fieldId), senderId: Number(userId)});
    // }
    if (req ) {
        req.io.emit('following', {following: Number(1), fieldId: Number(fieldId), userId: Number(userId), fieldOwnerId: Number(fieldOwnerId)});
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).json({message: 'Server error'});
  }


}
);
router.delete('/cancel-following', async (req, res) => {
    const {fieldId, userId} = req.body;
    try {
        const result = await pool.query('DELETE FROM following WHERE user_id = $1 AND field_id = $2 RETURNING *', [userId, fieldId]);
        const dataField = await pool.query('SELECT user_id FROM field WHERE field_id = $1', [fieldId]);
        const fieldOwnerId = dataField.rows[0]?.user_id;
        res.status(200).json({message: 'Following removed successfully', following: 0, data: result.rows[0]});
        if (req ) {
            req.io.emit('following', {following: Number(0), fieldId: Number(fieldId), userId: Number(userId), fieldOwnerId: Number(fieldOwnerId)});
        }


    } catch (err) {
        console.error(err.message);
        res.status(500).json({message: 'Server error'});
    }
});

router.get('/get-following/:userId', async (req, res) => {
    const {userId} = req.params;
    try {
        const result = await pool.query('SELECT * FROM following WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(200).json({following: 0, message: 'No following found for this user'});
        }else{
        res.status(200).json({following:1});  
        console.log(result.rows[0]);}
    } catch (err) {
        console.error(err.message);
        res.status(500).json({message: 'Server error'});
    }
});

router.get('/all-followers/:fieldId', async (req, res) => {
    const {fieldId} = req.params;
    try {
        const result = await pool.query('SELECT f.user_id,u.first_name,u.last_name,u.user_profile FROM following f JOIN users u ON f.user_id = u.user_id WHERE f.field_id = $1', [fieldId]);
        const countFollowers = result.rows.length;
        console.log('Number of followers:', countFollowers);

        res.status(200).json({countFollowers, data: result.rows});

    } catch (err) {
        console.error(err.message);
        res.status(500).json({message: 'Server error'});
    }
});

module.exports = router;