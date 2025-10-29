#include <iostream>
#include <string>
#include <cmath>
#include <cctype>
using namespace std;
template <typename T>
class Stack {
private:
    struct Node {
        T data;
        Node* next;
        Node(T val) : data(val), next(nullptr) {}
    };
    Node* topNode;
    int size;
public:
    Stack() : topNode(nullptr), size(0) {}
    ~Stack() { while (!isEmpty()) pop(); }
    void push(T val) {
        Node* newNode = new Node(val);
        newNode->next = topNode;
        topNode = newNode;
        size++;
    }
    void pop() {
        if (isEmpty()) return;
        Node* temp = topNode;
        topNode = topNode->next;
        delete temp;
        size--;
    }
    T top() const {
        if (isEmpty()) throw "Stack is empty";
        return topNode->data;
    }
    bool isEmpty() const { return topNode == nullptr; }
    int getSize() const { return size; }
};
enum Operator {
    ADD, 
    SUB,
    MUL,
    DIV,
    POW,
    FAC,
    L_P,
    R_P,
    EOE 
};
const char pri[9][9] = {
    //  当前 →  ADD  SUB  MUL  DIV  POW  FAC  L_P  R_P  EOE
    /* 栈顶 ADD */  '>', '>', '<', '<', '<', '<', '<', '>', '>',
    /* 栈顶 SUB */  '>', '>', '<', '<', '<', '<', '<', '>', '>',
    /* 栈顶 MUL */  '>', '>', '>', '>', '<', '<', '<', '>', '>',
    /* 栈顶 DIV */  '>', '>', '>', '>', '<', '<', '<', '>', '>',
    /* 栈顶 POW */  '>', '>', '>', '>', '>', '<', '<', '>', '>',
    /* 栈顶 FAC */  '>', '>', '>', '>', '>', '>', '<', '>', '>',
    /* 栈顶 L_P */  '<', '<', '<', '<', '<', '<', '<', '=', ' ',
    /* 栈顶 R_P */  '>', '>', '>', '>', '>', '>', ' ', '>', '>',
    /* 栈顶 EOE */  '<', '<', '<', '<', '<', '<', '<', ' ', '='
};
Operator charToOp(char c) {
    switch (c) {
        case '+': return ADD;
        case '-': return SUB;
        case '*': return MUL;
        case '/': return DIV;
        case '^': return POW;
        case '!': return FAC;
        case '(': return L_P;
        case ')': return R_P;
        default:  return EOE;
    }
}
double calculate(double a, double b, Operator op) {
    switch (op) {
        case ADD: return a + b;
        case SUB: return a - b;
        case MUL: return a * b;
        case DIV:
            if (fabs(b) < 1e-9) throw "除以零错误";
            return a / b;
        case POW: return pow(a, b);
        case FAC: { 
            int n = static_cast<int>(a);
            if (n < 0) throw "负阶乘错误";
            double res = 1;
            for (int i = 1; i <= n; ++i) res *= i;
            return res;
        }
        default: throw "无效运算符";
    }
}
string stringCalculator(const string& expr) {
    Stack<double> numStack;
    Stack<Operator> opStack;
    opStack.push(EOE);
    int i = 0;
    int n = expr.size();
    try {
        while (i < n || !opStack.isEmpty()) {
            if (i < n && (isdigit(expr[i]) || expr[i] == '.')) {
                double num = 0;
                bool hasDot = false;
                int decimal = 0;
                while (i < n && (isdigit(expr[i]) || (expr[i] == '.' && !hasDot))) {
                    if (expr[i] == '.') {
                        hasDot = true;
                    } else if (hasDot) {
                        num = num + (expr[i] - '0') / pow(10, ++decimal);
                    } else {
                        num = num * 10 + (expr[i] - '0');
                    }
                    i++;
                }
                numStack.push(num);
            }
            else if (i < n && expr[i] == ' ') {
                i++;
            }
            else {
                Operator currOp = (i < n) ? charToOp(expr[i]) : EOE;
                Operator topOp = opStack.top();
                char relation = pri[topOp][currOp];
                if (relation == '<') {
                    opStack.push(currOp);
                    i++;
                } else if (relation == '>') {
                    Operator op = opStack.top();
                    opStack.pop();
                    if (op == FAC) {
                        if (numStack.isEmpty()) return "无效表达式";
                        double a = numStack.top();
                        numStack.pop();
                        numStack.push(calculate(a, 0, op));
                    } else {
                        if (numStack.getSize() < 2) return "无效表达式";
                        double b = numStack.top();
                        numStack.pop();
                        double a = numStack.top();
                        numStack.pop();
                        numStack.push(calculate(a, b, op));
                    }
                } else if (relation == '=') { 
                    opStack.pop();
                    i++;
                } else {
                    return "无效表达式";
                }
            }
        }
    } catch (const char* msg) {
        return msg;
    } catch (...) {
        return "计算错误";
    }
    if (numStack.getSize() != 1) return "无效表达式";
    return to_string(numStack.top());
}
int main() {
    // 有效案例
    cout << "1+2*3 = " << stringCalculator("1+2*3") << endl;
    cout << "(1+2)*3 = " << stringCalculator("(1+2)*3") << endl;
    cout << "10/2-3 = " << stringCalculator("10/2-3") << endl;
    cout << "2^3 = " << stringCalculator("2^3") << endl;
    cout << "5! = " << stringCalculator("5!") << endl; 
    cout << "(2+3)^2! = " << stringCalculator("(2+3)^2!") << endl;
    cout << "3+4*2^2 = " << stringCalculator("3+4*2^2") << endl;
    // 无效案例
    cout << "\n1+*2 = " << stringCalculator("1+*2") << endl; 
    cout << "(1+2 = " << stringCalculator("(1+2") << endl; 
    cout << "5/0 = " << stringCalculator("5/0") << endl;
    cout << "(-3)! = " << stringCalculator("(-3)!") << endl;
    return 0;
}