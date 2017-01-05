#version 330 core
out vec4 color;
in vec2 TexCoords;

uniform sampler2D hdrBuffer;
uniform bool hdr;
uniform float exposure;

vec4 get_pixel(in vec2 coords, in float dx, in float dy) { 
   return texture2D(hdrBuffer,coords + vec2(dx, dy));
}

float[9] GetData(in int channel) 
{
   float dxtex = 1.0 / float(textureSize(hdrBuffer,0));  
   float dytex = 1.0 / float(textureSize(hdrBuffer,0));
   float[9] mat;
   int k = -1;
   for (int i=-1; i<2; i++) {   
      for(int j=-1; j<2; j++) {    
         k++;   
         mat[k] = get_pixel(TexCoords,float(i)*dxtex,float(j)*dytex)[channel];
      }
   }
   return mat;
}

float[9] R_coeff(float dist)
{
	float pi = 3.14159;
    float alpha = 1.6;
    float scale = alpha;
	float hypotenuse_dist = sqrt(pow(dist,2) + pow(dist,2));
	float[9] dist_mat = float[] (hypotenuse_dist, dist, hypotenuse_dist,
                                 dist,            0.0,             dist,
                                 hypotenuse_dist, dist, hypotenuse_dist);
	float[9] R_coeff_mat;
	for(int i =0;i < 9;i++)
	{
	    R_coeff_mat[i] = (1/pi*pow(alpha*scale,2))*exp(-dist_mat[i]/pow(alpha*scale,2));
	}
	return R_coeff_mat;
} 


float Convolve(in float[9] input_matrix,float dist) {
	float[9] R_mat = R_coeff(dist);
    float res = 0.0;
	float offset = 0.0;
	float hypotenuse_dist = sqrt(pow(dist,2) + pow(dist,2));
	float convlution_denom = hypotenuse_dist*4 + dist*4;
    for (int i=0; i<9; i++) {
       res += R_mat[i]*input_matrix[i];
    }
    return clamp(res/convlution_denom + offset,0.0,1.0);
}

void main()
{             
    const float gamma = 2.2;
    vec3 hdrColor = texture(hdrBuffer, TexCoords).rgb;
    if(hdr)
    {
		//dodging and burning
		float mat_r[9] = GetData(0);
		float mat_g[9] = GetData(1);
		float mat_b[9] = GetData(2);
		float dist = 1.0;
		vec3 result = vec3(Convolve(mat_r,dist),Convolve(mat_g,dist),Convolve(mat_b,dist));
		result = hdrColor / ( vec3(1.0) + result );
		
		
		// reinhard
        //vec3 result = hdrColor / (hdrColor + vec3(1.0));
        // also gamma correct while we're at it       
        result = pow(result, vec3(1.0 / gamma));
        color = vec4(result, 1.0f);
    }
    else
    {
        vec3 result = pow(hdrColor, vec3(1.0 / gamma));
        color = vec4(result, 1.0);
    }
}