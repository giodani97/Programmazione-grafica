#version 330 core

uniform float ourGreen;

out vec4 FragColor;
void main(){
    FragColor = vec4(0.0f, ourGreen, 0.0f, 1.0);
}