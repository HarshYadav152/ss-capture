#include <iostream>
using namespace std;

int main() {
    char op;
    float num1, num2;

    cout << "Enter first number: ";
    cin >> num1;

    cout << "Enter operation (+, -, *, /): ";
    cin >> op;

    cout << "Enter second number: ";
    cin >> num2;


    if (op == '+') {
        cout << "Sum = " << num1 + num2 << endl;

    } else if (op == '-') {
        cout << "Difference = " << num1 - num2 << endl;

    } else if (op == '*') {
        cout << "Product = " << num1 * num2 << endl;

    } else if (op == '/') {
        if (num2 != 0)
            cout << "Quotient = " << num1 / num2 << endl;

        else
            cout << "Error: Division by zero!" << endl;

    } else {
        cout << "Invalid operation!" << endl;
    }
    return 0;
}