import { useEffect, useRef, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from '@tarojs/taro'
import styles from  "./index.module.less";

const VALID_CODE = "123456";

const Invitation = () => {
  const [code, setCode] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const inputRefs = useRef(Array(6).fill(null));
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Ensure only digits are entered.
    setError("");

    if (index !== currentIndex) return;

    const newCode = [...code];
    newCode[index] = value; // Store value as a string.
    setCode(newCode);

    if (value && index < 5) {
      setCurrentIndex(index + 1); // Move to the next input field.
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault(); // Prevent default backspace behavior
      const newCode = [...code];
      
      if (code[index]) {
        // If current input has value, clear it
        newCode[index] = "";
        setCode(newCode);
      } else if (index > 0) {
        // If current input is empty and not first input, clear previous input
        newCode[index - 1] = "";
        setCode(newCode);
        setCurrentIndex(index - 1);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d*$/.test(pastedData)) return;

    setError("");
    const newCode = [...code];
    pastedData.split("").forEach((char, index) => {
      newCode[index] = char;
    });
    setCode(newCode);

    const nextEmptyIndex = newCode.findIndex((c) => !c);
    if (nextEmptyIndex !== -1) {
      setCurrentIndex(nextEmptyIndex);
    } else {
      setCurrentIndex(5); // Focus on the last input if the code is fully entered.
    }
  };

  const handleSubmit = () => {
    const enteredCode = code.join("");
    if (enteredCode === VALID_CODE) {
      sessionStorage.setItem("isAuthenticated", "true");
      Taro.navigateTo({ url: 'pages/digital/index' })
     
    } else {
      setError("验证码错误，请重新输入");
      setCode(Array(6).fill("")); // Clear the code on error.
      setCurrentIndex(0);
    }
  };

  const handleFocus = (index, e) => {
    // Prevent manual focus change by clicking
    e.preventDefault();
    // Force focus back to current index
    inputRefs.current[currentIndex]?.focus();
  };

  useEffect(() => {
    inputRefs.current[0]?.focus(); // Focus the first input on mount.
  }, []);

  useEffect(() => {
  
    const fill = code.every((digit) => digit !== "");
    if (fill) {
      handleSubmit();
    }
  }, [code]);

  useEffect(() => {
    inputRefs.current[currentIndex]?.focus(); // Focus the current input.
  }, [currentIndex]);

  return (
    <View className={styles.container}>
      <View className={styles.wrapper}>
        <View className={styles.title}>邀请码</View>
        <View className={styles.subtitle}>请输入您的六位数邀请码</View>

        <View className={styles.inputContainer}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type='number'
              value={digit}
              onInput={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => handleFocus(index, e)}
              className={styles.input}
              maxLength={1}
              readOnly={index !== currentIndex}
            />
          ))}
        </View>

        {error && <Text className={styles.error}>{error}</Text>}

        {/* <Button
          className={styles.button}
          disabled={code.some((digit) => digit === "")} // Disable button if code is incomplete.
          onClick={handleSubmit}
        >
          确认
        </Button> */}
      </View>
    </View>
  );
};

export default Invitation;
