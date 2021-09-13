#version 330 core

uniform float xPos;

layout (location = 0) in vec3 aPos; 
void main(){
	gl_Position = vec4(aPos.x + xPos, aPos.y, aPos.z, 1.0);
}