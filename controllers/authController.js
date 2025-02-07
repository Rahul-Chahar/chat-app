const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            name,
            email,
            phone,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "User created successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};