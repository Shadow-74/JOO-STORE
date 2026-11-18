using System;

class Program {
    static void Main() {
        float a, b;

        Console.WriteLine("Enter first number: ");
        a = float.Parse(Console.ReadLine());

        Console.WriteLine("Enter second number: ");
        b = float.Parse(Console.ReadLine());

        Console.WriteLine("Addition = " + (a + b));
        Console.WriteLine("Subtraction = " + (a - b));
        Console.WriteLine("Multiplication = " + (a * b));
        Console.WriteLine("Modulus5 = " + (a % b));

        if (b != 0) {
            Console.WriteLine("Division = " + (a / b));
        } else {
            Console.WriteLine("Cannot divide by zero");
        }
    }
}
